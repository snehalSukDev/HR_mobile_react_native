import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Button,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialIcons } from "@expo/vector-icons";
import { getResourceList, getResource } from "../utils/frappeApi";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const HolidaysScreen = ({ currentUserEmail, currentEmployeeId }) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [holidayTypeFilter, setHolidayTypeFilter] = useState("All");
  const { width } = useWindowDimensions();
  const isSmall = width < 400;
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchHolidays = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      const listNames = await getResourceList("Holiday List", {
        filters: JSON.stringify([
          ["from_date", "<=", yearEnd],
          ["to_date", ">=", yearStart],
        ]),
        fields: JSON.stringify(["name"]),
        order_by: "name asc",
      });

      if (!isMountedRef.current) return;

      let result = [];
      for (const list of listNames) {
        if (!isMountedRef.current) return;
        const doc = await getResource("Holiday List", list.name);
        if (doc?.holidays?.length) {
          doc.holidays.forEach((item) => {
            if (item.holiday_date?.startsWith(currentYear.toString())) {
              result.push({
                id: `${list.name}-${item.idx || item.holiday_date}`,
                holiday_date: item.holiday_date,
                description: item.description,
                weekly_off: item.weekly_off,
              });
            }
          });
        }
      }
      if (isMountedRef.current) {
        setHolidays(result);
      }
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        setError("Failed to load holidays.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [currentYear]);

  useFocusEffect(
    useCallback(() => {
      fetchHolidays();
    }, [fetchHolidays]),
  );

  const handleYearChange = (delta) => setCurrentYear((y) => y + delta);

  const { upcomingHolidays, pastHolidays } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = holidays.filter(
      (h) =>
        holidayTypeFilter === "All" ||
        (holidayTypeFilter === "Weekly Off" && h.weekly_off) ||
        (holidayTypeFilter === "Public Holiday" && !h.weekly_off),
    );

    const upcoming = [];
    const past = [];

    [...filtered]
      .sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date))
      .forEach((h) => {
        const date = new Date(h.holiday_date);
        (date >= today ? upcoming : past).push(h);
      });

    return { upcomingHolidays: upcoming, pastHolidays: past.reverse() };
  }, [holidays, holidayTypeFilter]);

  const renderList = (data, title) => (
    <View style={styles.holidaysSubSection}>
      <Text style={styles.subSectionTitle}>{title}</Text>

      {data.length > 0 ? (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, styles.colDate]}>Date</Text>
            <Text style={[styles.tableCol, styles.colDescription]}>
              Description
            </Text>
            <Text style={[styles.tableCol, styles.colType]}>Type</Text>
          </View>

          {data.map((h) => (
            <View key={h.id} style={styles.tableRow}>
              <Text style={[styles.tableCol, styles.colDate]}>
                {formatDate(h.holiday_date)}
              </Text>
              <Text style={[styles.tableCol, styles.colDescription]}>
                {h.description || "—"}
              </Text>
              <Text
                style={[
                  styles.tableCol,
                  styles.colType,
                  h.weekly_off ? styles.weeklyType : styles.publicType,
                ]}
              >
                {h.weekly_off ? "Weekly Off" : "Public Holiday"}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noDataText}>
          No {title.toLowerCase()} for {currentYear}.
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading holidays...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={fetchHolidays} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Holidays ({currentYear})</Text>
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            onPress={() => handleYearChange(-1)}
            style={styles.navButton}
          >
            <MaterialIcons name="chevron-left" size={24} color="#007bff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleYearChange(1)}
            style={styles.navButton}
          >
            <MaterialIcons name="chevron-right" size={24} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.holidayFilterControls}>
        <Text style={styles.filterLabel}>Filter:</Text>
        <Picker
          selectedValue={holidayTypeFilter}
          onValueChange={setHolidayTypeFilter}
          style={[styles.holidayTypeSelect, isSmall && { width: 180 }]}
        >
          <Picker.Item label="All" value="All" />
          <Picker.Item label="Public Holidays" value="Public Holiday" />
          <Picker.Item label="Weekly Offs" value="Weekly Off" />
        </Picker>
      </View>

      {renderList(upcomingHolidays, "Upcoming Holidays")}
      {currentYear <= new Date().getFullYear() &&
        renderList(pastHolidays, "Past Holidays")}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5", padding: 15 },
  contentContainer: { paddingBottom: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16 },
  errorText: { color: "red", marginBottom: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  navigationButtons: { flexDirection: "row" },
  navButton: {
    padding: 8,
    borderRadius: 5,
    marginLeft: 5,
    backgroundColor: "#e3f2fd",
  },
  holidayFilterControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },

  filterLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },

  holidayTypeSelect: {
    flex: 1,
    minWidth: 160,
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 6,
  },

  holidaysSubSection: { marginBottom: 25 },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
    marginBottom: 10,
  },
  noDataText: {
    color: "#777",
    textAlign: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
  },
  holidayEntry: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
  },
  holidayEntrySmall: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 5,
  },
  holidayDate: { fontSize: 14, fontWeight: "600", color: "#444", width: 100 },
  holidayDescription: { flex: 1, fontSize: 14, color: "#555", marginLeft: 10 },
  holidayTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  typePublicHoliday: { backgroundColor: "#e3f2fd" },
  typePublicHolidayText: {
    color: "#1976d2",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  typeWeeklyOff: { backgroundColor: "#e8f5e9" },
  typeWeeklyOffText: {
    color: "#388e3c",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  table: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#007bff",
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },
  tableCol: {
    paddingHorizontal: 8,
    fontSize: 13,
    color: "#333",
  },
  colDate: {
    flex: 1.2,
    fontWeight: "bold",
    color: "#333",
  },
  colDescription: {
    flex: 2.5,
  },
  colType: {
    flex: 1.5,
    textAlign: "center",
    fontWeight: "600",
  },
  publicType: {
    color: "#1976d2",
  },
  weeklyType: {
    color: "#388e3c",
  },
});

export default HolidaysScreen;
