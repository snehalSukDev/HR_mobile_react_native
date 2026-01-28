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
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getResourceList } from "../utils/frappeApi";
import { Picker } from "@react-native-picker/picker";
import { Megaphone, List as ListIcon } from "lucide-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import DoctypeFormModal from "../Components/DoctypeFormModal";
import CustomLoader from "../Components/CustomLoader";
import Toast from "react-native-toast-message";
import { useTheme } from "../context/ThemeContext";

const DOCTYPE = "Announcement";

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Draft", value: "Draft" },
  { label: "Expired", value: "Expired" },
  { label: "Scheduled", value: "Scheduled" },
];

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), "dd MMM yy");
  } catch (e) {
    return dateString;
  }
};

const cleanHtmlText = (input) => {
  try {
    if (!input) return "";
    const s = String(input);
    return s
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return String(input || "");
  }
};

const AnnouncementScreen = () => {
  const { colors, theme } = useTheme();
  const isMountedRef = useRef(true);

  const getStatusColors = (status) => {
    const isDark = theme === "dark";
    const map = {
      Draft: {
        bg: isDark ? "#1a3d3d" : "#e0f2f1",
        text: isDark ? "#80cbc4" : "#00695c",
      },
      Scheduled: {
        bg: isDark ? "#3d291a" : "#fff3e0",
        text: isDark ? "#ffcc80" : "#ef6c00",
      },
      Expired: {
        bg: isDark ? "#3d1a1a" : "#ffebee",
        text: isDark ? "#ef9a9a" : "#c62828",
      },
      Active: {
        bg: isDark ? "#1b3d1b" : "#e8f5e9",
        text: isDark ? "#a5d6a7" : "#2e7d32",
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
      searchWrapper: {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      searchInput: { color: colors.text },
      filterContainer: {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      filterLabel: { color: colors.textSecondary },
      selectedBadge: { backgroundColor: theme === "dark" ? "#333" : "#e9ecef" },
      selectedBadgeText: { color: colors.text },
      listHeaderBar: { backgroundColor: theme === "dark" ? "#333" : "#e9ecef" },
      listHeaderTitle: { color: colors.text },
      loadingText: { color: colors.textSecondary },
      modalBackdrop: { backgroundColor: "rgba(0,0,0,0.5)" },
      modalCard: { backgroundColor: colors.card, borderColor: colors.border },
      modalTitle: { color: colors.text },
      modalBody: { backgroundColor: colors.card },
      detailLabel: { color: colors.textSecondary },
      detailValue: { color: colors.text },
    }),
    [colors, theme],
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 500);
  }, [searchInput]);

  const fetchAnnouncements = useCallback(
    async (isRefresh = false) => {
      if (!isMountedRef.current) return;

      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      try {
        const filters = [];
        if (searchTerm) {
          filters.push(["subject", "like", `%${searchTerm}%`]);
        }
        if (statusFilter !== "all") {
          filters.push(["status", "=", statusFilter]);
        }

        const data = await getResourceList(DOCTYPE, {
          fields: ["*"],
          filters: [],

          order_by: "modified desc",
          limit: 10,
          as_dict: true,
          cache: true,
          forceRefresh: isRefresh,
        });

        if (isMountedRef.current) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error fetching announcements:", err);
        if (isMountedRef.current) {
          const errString = String(err);
          if (
            errString.includes("403") ||
            errString.includes("No permission") ||
            errString.includes("does not have doctype access")
          ) {
            const msg = "You do not have permission to view Announcements.";
            setError(msg);
            Toast.show({
              type: "error",
              text1: "Permission Error",
              text2: msg,
            });
          } else {
            setError("Failed to load announcements.");
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "Failed to load announcements.",
            });
          }
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [statusFilter, searchTerm],
  );

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements();
    }, [fetchAnnouncements]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements(true);
  };

  const handleItemPress = (item) => {
    setSelectedAnnouncement(item);
  };

  const renderItem = ({ item }) => {
    const title = item.title || item.subject || item.name;
    const content = cleanHtmlText(item.content || "");
    const status = item.status || "Draft";
    const { bg, text } = getStatusColors(status);

    return (
      <TouchableOpacity
        style={[styles.card, dynamicStyles.card]}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <Megaphone size={20} color="#555" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.titleText, dynamicStyles.text]}>{title}</Text>
            <Text style={[styles.dateText, dynamicStyles.textSecondary]}>
              {content}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: bg }]}>
            <Text style={[styles.statusText, { color: text }]}>{status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.headerContainer, dynamicStyles.headerContainer]}>
      <View style={styles.toolbar}>
        <View style={[styles.searchWrapper, dynamicStyles.searchWrapper]}>
          <TextInput
            style={[styles.searchInput, dynamicStyles.searchInput]}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search announcements"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewModal(true)}
        >
          <Text style={styles.addButtonText}>New Announcement</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.filterContainer, dynamicStyles.filterContainer]}>
        <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>
          Status:
        </Text>
        <View style={[styles.selectedBadge, dynamicStyles.selectedBadge]}>
          <Text
            style={[styles.selectedBadgeText, dynamicStyles.selectedBadgeText]}
          >
            {statusOptions.find((o) => o.value === statusFilter)?.label ||
              "All"}
          </Text>
        </View>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={statusFilter}
            onValueChange={setStatusFilter}
            style={[styles.picker, { color: colors.text }]}
            mode="dropdown"
            dropdownIconColor={colors.text}
            prompt="Status"
          >
            {statusOptions.map((opt) => (
              <Picker.Item
                key={opt.value}
                label={opt.label}
                value={opt.value}
                style={styles.pickerItem}
                color={colors.text}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={[styles.listHeaderBar, dynamicStyles.listHeaderBar]}>
        <View style={styles.listHeaderLeft}>
          <ListIcon size={18} color={colors.primary} />
          <Text style={[styles.listHeaderTitle, dynamicStyles.listHeaderTitle]}>
            Announcements
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{items.length}</Text>
        </View>
      </View>
    </View>
  );

  if (error) {
    // Show error in list empty component or just toast?
    // User asked for toast, so we rely on toast shown in catch block.
    // We can keep this return null or render the list with empty state.
    // To allow retry, we render the screen normally.
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <CustomLoader visible={loading && !refreshing} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
              No announcements found.
            </Text>
          </View>
        }
      />
      <DoctypeFormModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        doctype={DOCTYPE}
        title="Announcement"
        onSuccess={() => {
          fetchAnnouncements();
        }}
        hiddenFields={[
          "expire_notification_on",
          "filter_type",
          "add_manually",
          "exclude_filtered_data",
          "designation",
          "department",
          "branch",
          "grade",
          "role",
        ]}
      />

      {/* Detail Modal */}
      <Modal
        visible={!!selectedAnnouncement}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAnnouncement(null)}
      >
        <View style={[styles.modalBackdrop, dynamicStyles.modalBackdrop]}>
          <View style={[styles.modalCard, dynamicStyles.modalCard]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                {selectedAnnouncement?.title ||
                  selectedAnnouncement?.subject ||
                  "Announcement"}
              </Text>
              <TouchableOpacity onPress={() => setSelectedAnnouncement(null)}>
                <MaterialIcons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={[styles.modalBody, dynamicStyles.modalBody]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>
                  Status
                </Text>
                <Text style={[styles.detailValue, dynamicStyles.detailValue]}>
                  {selectedAnnouncement?.status || "Draft"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>
                  Date
                </Text>
                <Text style={[styles.detailValue, dynamicStyles.detailValue]}>
                  {formatDate(
                    selectedAnnouncement?.start_date ||
                      selectedAnnouncement?.end_date,
                  )}
                </Text>
              </View>
              <View
                style={[
                  styles.detailRow,
                  {
                    flexDirection: "column",
                    alignItems: "flex-start",
                    marginTop: 10,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.detailLabel,
                    dynamicStyles.detailLabel,
                    { marginBottom: 4 },
                  ]}
                >
                  Content
                </Text>
                <Text style={[styles.detailValue, dynamicStyles.detailValue]}>
                  {cleanHtmlText(selectedAnnouncement?.content || "")}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  searchWrapper: {
    flex: 1,
    marginRight: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  searchInput: {
    fontSize: 14,
    color: "#333",
  },
  addButton: {
    backgroundColor: "#271085",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
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
  titleText: {
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
    maxHeight: "80%",
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
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    flex: 1,
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
});

export default AnnouncementScreen;
