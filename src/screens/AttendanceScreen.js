import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { getResource, getResourceList } from "../utils/frappeApi";
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
  CalendarCheck,
} from "lucide-react-native";
import { format, parseISO } from "date-fns";
import { useFocusEffect } from "@react-navigation/native";
import DoctypeFormModal from "../Components/DoctypeFormModal";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), "dd MMM yy");
  } catch (e) {
    return dateString;
  }
};

const statusToColorMap = {
  Absent: { bg: "#F9C4C1", text: "#721c24", title: "Absent" },
  "On Leave": { bg: "#EBD7F8", text: "#856404", title: "On Leave" },
  Present: { bg: "#C9EFD0", text: "#155724", title: "Present" },
  Holiday: { bg: "#FFF8CD", text: "#0c5460", title: "Holiday" },
  "Work From Home": { bg: "#C1D7FF", text: "#1b1e21", title: "Work From Home" },
};

const getMonthRange = ({ year, month }) => {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${endDate.getFullYear()}-${String(
    endDate.getMonth() + 1,
  ).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
};

const AttendanceScreen = ({ currentUserEmail, currentEmployeeId }) => {
  const isMountedRef = useRef(true);
  const [open, setOpen] = useState(false);
  const [recentAttendanceList, setRecentAttendanceList] = useState([]);
  const [monthAttendanceList, setMonthAttendanceList] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState("list");
  const [selectedAttendanceDetails, setSelectedAttendanceDetails] =
    useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [dayModalData, setDayModalData] = useState({
    date: "",
    status: "",
    title: "",
    employeeName: "",
    description: "",
  });
  const today = useMemo(() => new Date(), []);
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  }));
  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().split("T")[0],
  );
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [loadedCalendarMonthKey, setLoadedCalendarMonthKey] = useState(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const calendarCurrent = useMemo(() => {
    return `${calendarMonth.year}-${String(calendarMonth.month).padStart(
      2,
      "0",
    )}-01`;
  }, [calendarMonth.month, calendarMonth.year]);
  const normalizedViewType = viewType === "calender" ? "calendar" : viewType;

  const fetchRecentAttendance = useCallback(
    async (isRefresh = false) => {
      if (!currentEmployeeId) {
        if (isMountedRef.current) {
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

      try {
        const attendanceList = await getResourceList("Attendance", {
          filters: JSON.stringify([["employee", "=", currentEmployeeId]]),
          fields: JSON.stringify(["*"]),
          orderBy: {
            field: "attendance_date",
            order: "desc",
          },
          limit: "*",
          asDict: true,
        });
        if (isMountedRef.current) {
          setRecentAttendanceList(attendanceList || []);
        }
      } catch (error) {
        console.error("Error fetching attendance:", error);
        if (isMountedRef.current) {
          Alert.alert("Error", "Failed to fetch attendance records.");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentEmployeeId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchRecentAttendance();
    }, [fetchRecentAttendance]),
  );

  const fetchHolidays = useCallback(async () => {
    if (!currentEmployeeId) return;
    try {
      const employeeDoc = await getResource("Employee", currentEmployeeId);
      const holidayListName = employeeDoc?.holiday_list;
      if (!holidayListName) {
        if (isMountedRef.current) {
          setHolidays([]);
        }
        return;
      }
      const holidayListDoc = await getResource("Holiday List", holidayListName);
      const list = Array.isArray(holidayListDoc?.holidays)
        ? holidayListDoc.holidays
            .map((h) => ({
              date: h.holiday_date || h.date,
              description: h.description || "",
            }))
            .filter((h) => typeof h.date === "string" && h.date.length >= 10)
        : [];
      if (isMountedRef.current) {
        setHolidays(list);
      }
    } catch (error) {
      console.error("Error fetching holidays:", error);
    }
  }, [currentEmployeeId]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const fetchMonthAttendance = useCallback(
    async (monthInfo, isRefresh = false) => {
      if (!currentEmployeeId) {
        if (isMountedRef.current) {
          if (isRefresh) {
            setRefreshing(false);
          } else {
            setCalendarLoading(false);
          }
        }
        return;
      }

      if (!isMountedRef.current) return;

      if (!isRefresh) {
        setCalendarLoading(true);
      }

      const { start, end } = getMonthRange(monthInfo);

      try {
        const data = await getResourceList("Attendance", {
          filters: JSON.stringify([
            ["employee", "=", currentEmployeeId],
            ["attendance_date", ">=", start],
            ["attendance_date", "<=", end],
          ]),
          fields: ["*"],
          order_by: "attendance_date asc",
          limit_page_length: 500,
          asDict: true,
        });
        if (isMountedRef.current) {
          setMonthAttendanceList(data || []);
          setLoadedCalendarMonthKey(`${monthInfo.year}-${monthInfo.month}`);
        }
      } catch (error) {
        console.error("Error fetching month attendance:", error);
        if (isMountedRef.current) {
          Alert.alert("Error", "Failed to fetch monthly attendance.");
        }
      } finally {
        if (isMountedRef.current) {
          setCalendarLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentEmployeeId],
  );

  useEffect(() => {
    if (normalizedViewType !== "calendar") return;
    const key = `${calendarMonth.year}-${calendarMonth.month}`;
    if (loadedCalendarMonthKey === key && monthAttendanceList.length > 0)
      return;
    fetchMonthAttendance(calendarMonth);
  }, [
    fetchMonthAttendance,
    normalizedViewType,
    calendarMonth,
    loadedCalendarMonthKey,
    monthAttendanceList.length,
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    if (normalizedViewType === "calendar") {
      fetchMonthAttendance(calendarMonth, true);
      fetchHolidays();
    } else {
      fetchRecentAttendance(true);
    }
  };

  const markedDates = useMemo(() => {
    const marks = {};

    monthAttendanceList.forEach((entry) => {
      const key =
        typeof entry.attendance_date === "string"
          ? entry.attendance_date.split("T")[0]
          : null;
      if (!key) return;
      const status = entry.status || "Present";
      const colors = statusToColorMap[status] || {
        bg: "#f0f2f5",
        text: "#333",
        title: status,
      };
      marks[key] = {
        status,
        customStyles: {
          container: {
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.text + "33",
          },
          text: { color: colors.text, fontWeight: "bold" },
        },
      };
    });

    holidays.forEach((h) => {
      const key = h?.date;
      if (!key || marks[key]) return;
      const colors = statusToColorMap.Holiday;
      marks[key] = {
        status: "Holiday",
        description: h.description || "",
        customStyles: {
          container: {
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.text + "33",
          },
          text: { color: colors.text, fontWeight: "bold" },
        },
      };
    });

    if (selectedDate) {
      const existing = marks[selectedDate];
      const base =
        existing?.customStyles?.container?.backgroundColor || "transparent";
      marks[selectedDate] = {
        ...(existing || {}),
        customStyles: {
          container: {
            backgroundColor: base,
            borderWidth: 2,
            borderColor: "#271085",
          },
          text: existing?.customStyles?.text || {
            color: "#271085",
            fontWeight: "bold",
          },
        },
      };
    }

    return marks;
  }, [holidays, monthAttendanceList, selectedDate]);

  const renderDetailRow = (label, value) => {
    if (value == null || value === "") return null;
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{String(value)}</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const statusColor = statusToColorMap[item.status]?.bg || "#fff3cd";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedAttendanceDetails(item);
          setOpen(true);
        }}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <CalendarCheck size={20} color="#555" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.employeeName}>{item.employee_name}</Text>
            <Text style={styles.dateText}>
              {formatDate(item.attendance_date)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
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
              styles.iconButton,
              normalizedViewType === "list" && styles.activeIconButton,
            ]}
            onPress={() => setViewType("list")}
          >
            <ListIcon
              size={20}
              color={normalizedViewType === "list" ? "#fff" : "#333"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              normalizedViewType === "calendar" && styles.activeIconButton,
            ]}
            onPress={() => setViewType("calender")}
          >
            <CalendarIcon
              size={20}
              color={normalizedViewType === "calendar" ? "#fff" : "#333"}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setShowApplyModal(true);
          }}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>Add Attendance</Text>
        </TouchableOpacity>
      </View>

      {normalizedViewType === "list" && (
        <View style={styles.listHeaderBar}>
          <View style={styles.listHeaderLeft}>
            <ListIcon size={18} color="orange" />
            <Text style={styles.listHeaderTitle}>Attendance List</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{recentAttendanceList.length}</Text>
          </View>
        </View>
      )}
    </View>
  );

  if (loading && !refreshing && normalizedViewType === "list") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      {normalizedViewType === "calendar" ? (
        <>
          <Calendar
            current={calendarCurrent}
            enableSwipeMonths
            markingType="custom"
            markedDates={markedDates}
            onDayPress={(day) => {
              const key = day.dateString;
              setSelectedDate(key);
              const attendance = monthAttendanceList.find(
                (a) => (a.attendance_date || "").split("T")[0] === key,
              );
              const holiday = holidays.find((h) => h.date === key);
              const status = attendance?.status || (holiday ? "Holiday" : null);
              if (!status) return;
              const title = statusToColorMap[status]?.title || status;
              const desc = holiday?.description
                ? holiday.description.replace(/<[^>]+>/g, "").trim()
                : "";
              setDayModalData({
                date: key,
                status,
                title,
                employeeName: attendance?.employee_name || "",
                description: desc,
              });
              setDayModalVisible(true);
            }}
            onMonthChange={(m) => {
              const next = { year: m.year, month: m.month };
              setCalendarMonth(next);
              // rely on effect to fetch; avoids double fetch and global re-render
            }}
            style={styles.calendarStyle}
            theme={{
              todayTextColor: "#007bff",
              arrowColor: "#007bff",
            }}
          />
          {/* {calendarLoading && (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator size="small" color="#007bff" />
            </View>
          )} */}
          <View style={styles.legendContainer}>
            {Object.keys(statusToColorMap).map((key) => (
              <View key={key} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColorBox,
                    { backgroundColor: statusToColorMap[key].bg },
                  ]}
                />
                <Text style={styles.legendText}>{key}</Text>
              </View>
            ))}
          </View>
          <Modal
            visible={dayModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDayModalVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Day Details</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setDayModalVisible(false)}
                  >
                    <Text style={styles.modalCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{dayModalData.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            statusToColorMap[dayModalData.status]?.bg ||
                            "#f0f2f5",
                        },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {dayModalData.title || dayModalData.status}
                      </Text>
                    </View>
                  </View>
                  {dayModalData.employeeName ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Employee</Text>
                      <Text style={styles.detailValue}>
                        {dayModalData.employeeName}
                      </Text>
                    </View>
                  ) : null}
                  {dayModalData.description ? (
                    <View style={{ paddingTop: 10 }}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.dayDesc}>
                        {dayModalData.description}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <FlatList
          data={recentAttendanceList}
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No attendance records found.</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendance Details</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setOpen(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {renderDetailRow("Name", selectedAttendanceDetails?.name)}
              {renderDetailRow(
                "Employee",
                selectedAttendanceDetails?.employee_name ||
                  selectedAttendanceDetails?.employee,
              )}
              {renderDetailRow(
                "Date",
                selectedAttendanceDetails?.attendance_date
                  ? formatDate(selectedAttendanceDetails.attendance_date)
                  : null,
              )}
              {renderDetailRow("Status", selectedAttendanceDetails?.status)}
              {renderDetailRow("Shift", selectedAttendanceDetails?.shift)}
              {renderDetailRow("In Time", selectedAttendanceDetails?.in_time)}
              {renderDetailRow("Out Time", selectedAttendanceDetails?.out_time)}
              {renderDetailRow(
                "Working Hours",
                selectedAttendanceDetails?.working_hours,
              )}
              {renderDetailRow(
                "Modified",
                selectedAttendanceDetails?.modified
                  ? formatDate(selectedAttendanceDetails.modified)
                  : null,
              )}
            </View>
          </View>
        </View>
      </Modal>
      <DoctypeFormModal
        visible={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        doctype={"Attendance Request"}
        title="Attendance Request"
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
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  placeholderText: {
    marginTop: 10,
    color: "#999",
    fontSize: 16,
  },
  calendarStyle: {
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e9ecef",
    backgroundColor: "#fff",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 10,
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
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  modalCloseButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#271085",
  },
  modalCloseText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  modalBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  detailValue: {
    color: "#111",
    fontSize: 13,
    flex: 1,
    textAlign: "right",
  },
  dayDesc: {
    marginTop: 6,
    color: "#333",
    fontSize: 13,
    lineHeight: 18,
  },
});

export default AttendanceScreen;
