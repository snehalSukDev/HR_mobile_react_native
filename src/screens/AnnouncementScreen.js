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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getResourceList } from "../utils/frappeApi";
import { Picker } from "@react-native-picker/picker";
import { Megaphone, List as ListIcon } from "lucide-react-native";
import { format, parseISO } from "date-fns";
import DoctypeFormModal from "../Components/DoctypeFormModal";

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

const statusToColorMap = {
  Draft: { bg: "#e0f2f1", text: "#00695c" },
  Scheduled: { bg: "#fff3e0", text: "#ef6c00" },
  Expired: { bg: "#ffebee", text: "#c62828" },
  Active: { bg: "#e8f5e9", text: "#2e7d32" },
};

const AnnouncementScreen = () => {
  const isMountedRef = useRef(true);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
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
        });

        if (isMountedRef.current) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError("Failed to load announcements.");
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
    const title = item.title || item.subject || item.name;
    const status = item.status || "N/A";
    const dateText =
      item.start_date || item.end_date
        ? `${formatDate(item.start_date || item.end_date)}`
        : "";
    const lines = [];
    lines.push(`Status: ${status}`);
    if (dateText) {
      lines.push(`Date: ${dateText}`);
    }
    Alert.alert(title, lines.join("\n"));
  };

  const renderItem = ({ item }) => {
    const title = item.title || item.subject || item.name;
    const content = cleanHtmlText(item.content || "");
    const status = item.status || "Draft";
    const statusColor = statusToColorMap[status]?.bg || "#f0f2f5";
    const statusTextColor = statusToColorMap[status]?.text || "#333";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <Megaphone size={20} color="#555" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.titleText}>{title}</Text>
            <Text style={styles.dateText}>{content}</Text>
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
        <View style={styles.searchWrapper}>
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search announcements"
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewModal(true)}
        >
          <Text style={styles.addButtonText}>New Announcement</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>
            {statusOptions.find((o) => o.value === statusFilter)?.label ||
              "All"}
          </Text>
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
            {statusOptions.map((opt) => (
              <Picker.Item
                key={opt.value}
                label={opt.label}
                value={opt.value}
                style={styles.pickerItem}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.listHeaderBar}>
        <View style={styles.listHeaderLeft}>
          <ListIcon size={18} color="#271085" />
          <Text style={styles.listHeaderTitle}>Announcements</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{items.length}</Text>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading announcements...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Retry"
          onPress={() => fetchAnnouncements()}
          color="#007bff"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <Text style={styles.emptyText}>No announcements found.</Text>
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
});

export default AnnouncementScreen;
