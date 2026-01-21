import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  Button,
  Modal,
  Linking,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import {
  getResourceList,
  callFrappeMethod,
  getFrappeBaseUrl,
} from "../utils/frappeApi";
import { MaterialIcons } from "@expo/vector-icons";
import { List as ListIcon, DollarSign } from "lucide-react-native";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

const statusToColorMap = {
  Draft: { bg: "#e0f2f1", text: "#00695c" },
  Submitted: { bg: "#fff3e0", text: "#ef6c00" },
  Cancelled: { bg: "#ffebee", text: "#c62828" },
  Paid: { bg: "#e8f5e9", text: "#2e7d32" },
  Unpaid: { bg: "#ffebee", text: "#c62828" },
  Overdue: { bg: "#fce4ec", text: "#880e4f" },
};

const SalarySlipScreen = ({
  currentUserEmail,
  currentEmployeeId,
  onLogout,
}) => {
  const isMountedRef = useRef(true);
  const [salarySlips, setSalarySlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("structure");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [docinfo, setDocinfo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSalarySlips = useCallback(
    async (isRefresh = false) => {
      if (!currentEmployeeId) {
        if (isMountedRef.current) {
          if (isRefresh) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
          setError("Employee ID not available to fetch salary slips.");
        }
        return;
      }

      if (!isMountedRef.current) return;

      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);
      try {
        const filters = [["employee", "=", currentEmployeeId]];
        const slips = await getResourceList("Salary Slip", {
          filters: JSON.stringify(filters),
          fields: JSON.stringify([
            "name",
            "start_date",
            "end_date",
            "gross_pay",
            "net_pay",
            "status",
            "employee_name",
          ]),
          order_by: "start_date desc",
          limit_page_length: 20,
        });
        if (isMountedRef.current) {
          setSalarySlips(slips || []);
        }
      } catch (err) {
        console.error("Error fetching salary slips:", err);
        if (isMountedRef.current) {
          setError(
            `Failed to load salary slips: ${err.message || "Unknown error"}`,
          );
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

  useEffect(() => {
    fetchSalarySlips();
  }, [fetchSalarySlips]);

  const onRefresh = () => {
    if (!isMountedRef.current) return;
    setRefreshing(true);
    fetchSalarySlips(true);
  };

  const handleViewSalarySlip = async (slip) => {
    try {
      if (!isMountedRef.current) return;
      setSelectedSlip(slip);
      setDocinfo(null);
      setShowModal(true);
      const res = await callFrappeMethod("frappe.desk.form.load.get_docinfo", {
        doctype: "Salary Slip",
        name: slip.name,
      });

      const info = res?.docinfo || res?.message?.docinfo || res;
      if (isMountedRef.current) {
        setDocinfo(info || {});
      }
      console.log("Salary Slip Docinfo:", info);
    } catch (e) {
      if (isMountedRef.current) {
        setDocinfo(null);
        Alert.alert("Error", "Failed to load salary slip details");
      }
    }
  };

  const getAttachmentUrl = () => {
    const base = getFrappeBaseUrl() || "";
    const files =
      (docinfo &&
        (docinfo.attachments || docinfo.attachment || docinfo.files)) ||
      [];
    const first = Array.isArray(files) && files.length > 0 ? files[0] : null;
    const url =
      (first && (first.file_url || first.filepath || first.url)) || "";
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `${base}${url}`;
  };

  const getWebViewUrl = () => {
    const base = getFrappeBaseUrl() || "";
    const name = selectedSlip?.name || "";

    // Check for attachment first
    const att = getAttachmentUrl();
    if (att) return att;

    if (!base || !name) return null;

    // Use printview for WebView rendering
    const params = new URLSearchParams();
    params.append("doctype", "Salary Slip");
    params.append("name", name);
    params.append("format", "Standard");
    return `${base}/printview?${params.toString()}`;
  };

  const handleDownload = async () => {
    try {
      if (!isMountedRef.current) return;
      setDownloading(true);

      const url = getWebViewUrl();

      if (isMountedRef.current) {
        if (!url) {
          Alert.alert("View", "No document available to view");
        } else {
          setPdfUrl(url);
          setShowPdfModal(true);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setDownloading(false);
      }
    }
  };

  const renderItem = ({ item }) => {
    const statusColor = statusToColorMap[item.status]?.bg || "#f0f2f5";
    const statusTextColor = statusToColorMap[item.status]?.text || "#333";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleViewSalarySlip(item)}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <DollarSign size={20} color="#555" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.employeeName}>{item.employee_name}</Text>
            <Text style={styles.dateText}>
              {formatDate(item.start_date)} - {formatDate(item.end_date)}
            </Text>
            <Text style={styles.amountText}>
              Net: ₹ {parseFloat(item.net_pay || 0).toFixed(2)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusTextColor }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.listHeaderBar}>
        <View style={styles.listHeaderLeft}>
          <ListIcon size={18} color="orange" />
          <Text style={styles.listHeaderTitle}>Salary Slips List</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{salarySlips.length}</Text>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading salary slips...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Reload"
          onPress={() => fetchSalarySlips()}
          color="#007bff"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={salarySlips}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No salary slips found.</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Salary Slip</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            {selectedSlip ? (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ID</Text>
                  <Text style={styles.detailValue}>{selectedSlip.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Employee</Text>
                  <Text style={styles.detailValue}>
                    {selectedSlip.employee_name}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Period</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedSlip.start_date)} -{" "}
                    {formatDate(selectedSlip.end_date)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gross Pay</Text>
                  <Text style={styles.detailValue}>
                    ₹ {parseFloat(selectedSlip.gross_pay || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Net Pay</Text>
                  <Text style={styles.detailValue}>
                    ₹ {parseFloat(selectedSlip.net_pay || 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{selectedSlip.status}</Text>
                </View>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleDownload}
                    disabled={downloading}
                  >
                    <MaterialIcons
                      name="remove-red-eye"
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.primaryButtonText}>
                      {downloading ? "Loading..." : "View Slip"}
                    </Text>
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

      {/* PDF/WebView Modal */}
      <Modal
        visible={showPdfModal}
        animationType="slide"
        onRequestClose={() => setShowPdfModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#fff",
            paddingTop: Platform.OS === "android" ? 30 : 50,
          }}
        >
          <View style={[styles.modalHeader, { paddingHorizontal: 16 }]}>
            <Text style={styles.modalTitle}>Salary Slip View</Text>
            <TouchableOpacity
              onPress={() => setShowPdfModal(false)}
              style={{ padding: 4 }}
            >
              <MaterialIcons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>
          {pdfUrl && (
            <WebView
              source={{ uri: pdfUrl }}
              style={{ flex: 1 }}
              startInLoadingState
              renderLoading={() => (
                <View
                  style={[
                    styles.centered,
                    {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    },
                  ]}
                >
                  <ActivityIndicator size="large" color="#271085" />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa", // Match AttendanceScreen
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
  listHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e9ecef",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
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
  actionsRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#271085",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  // Tab buttons
  buttonContainer: {
    flexDirection: "row",
    marginBottom: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: "#e1e1e1",
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
});

export default SalarySlipScreen;
