import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Menu, Bell } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { callFrappeMethod } from "../utils/frappeApi";

function NotificationBell({ onLogout }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notify, setNotify] = useState([]);
  const [selected, setSelected] = useState(null);

  const generalNotifications = useMemo(
    () => (notify || []).filter((item) => item?.document_type !== "Event"),
    [notify]
  );

  const hasUnread = useMemo(() => {
    const isRead = (n) => n?.read === 1 || n?.read === true || n?.read === "1";
    return (generalNotifications || []).some((n) => !isRead(n));
  }, [generalNotifications]);

  const close = useCallback(() => {
    setVisible(false);
    setSelected(null);
    setError(null);
  }, []);

  const fetchNotifications = useCallback(
    async ({ showLoader = false } = {}) => {
      if (showLoader) {
        setError(null);
        setLoading(true);
      }
      try {
        const message = await callFrappeMethod(
          "frappe.desk.doctype.notification_log.notification_log.get_notification_logs"
        );
        setNotify(message?.notification_logs || []);
      } catch (e) {
        if (showLoader) {
          setNotify([]);
          setError(e?.message || "Failed to load notifications");
        }
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    []
  );

  const open = useCallback(async () => {
    setVisible(true);
    await fetchNotifications({ showLoader: true });
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();

    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 60000);

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        fetchNotifications();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription?.remove?.();
    };
  }, [fetchNotifications]);

  const title = selected ? "Notification" : "Notifications";

  const handleLogoutPress = () => {
    if (typeof onLogout === "function") {
      Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: onLogout, style: "destructive" },
      ]);
    } else {
      Alert.alert("Logout", "Logout action is not available in this context.");
    }
  };

  return (
    <>
      <TouchableOpacity onPress={open} style={{ marginRight: 20 }}>
        <View style={styles.bellWrap}>
          <Bell size={24} color="#000" />
          {hasUnread ? <View style={styles.badgeDot} /> : null}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleLogoutPress} style={{ marginRight: 16 }}>
        <MaterialIcons name="power-settings-new" size={24} color="#EA4335" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              {selected ? (
                <TouchableOpacity
                  onPress={() => setSelected(null)}
                  style={styles.iconButton}
                >
                  <MaterialIcons name="arrow-back" size={22} color="#111" />
                </TouchableOpacity>
              ) : (
                <View style={styles.iconButtonPlaceholder} />
              )}

              <Text style={styles.modalTitle}>{title}</Text>

              <TouchableOpacity onPress={close} style={styles.iconButton}>
                <MaterialIcons name="close" size={22} color="#111" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.helperText}>Loading notifications...</Text>
              </View>
            ) : error ? (
              <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={fetchNotifications}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : selected ? (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.detailTitle}>
                  {selected?.subject ||
                    selected?.document_name ||
                    "Notification"}
                </Text>
                {selected?.creation ? (
                  <Text style={styles.detailMeta}>
                    {new Date(selected.creation).toLocaleString()}
                  </Text>
                ) : null}
                <Text style={styles.detailBody}>
                  {selected?.email_content ||
                    selected?.message ||
                    selected?.subject ||
                    "No content"}
                </Text>
              </ScrollView>
            ) : (
              <ScrollView style={styles.modalBody}>
                {generalNotifications.length > 0 ? (
                  generalNotifications.map((notif) => {
                    const titleText =
                      notif?.subject ||
                      notif?.document_name ||
                      notif?.name ||
                      "Notification";
                    const preview =
                      typeof notif?.email_content === "string"
                        ? notif.email_content
                        : "";
                    return (
                      <View key={notif?.name} style={styles.notifCard}>
                        <Text style={styles.notifTitle} numberOfLines={2}>
                          {titleText}
                        </Text>
                        {notif?.creation ? (
                          <Text style={styles.notifMeta}>
                            {new Date(notif.creation).toLocaleString()}
                          </Text>
                        ) : null}
                        {preview ? (
                          <Text style={styles.notifPreview} numberOfLines={2}>
                            {preview}
                          </Text>
                        ) : null}

                        <TouchableOpacity
                          onPress={() => setSelected(notif)}
                          style={styles.readMoreButton}
                        >
                          <Text style={styles.readMoreText}>Read more</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.centered}>
                    <MaterialIcons
                      name="notifications-off"
                      size={56}
                      color="#dc3545"
                    />
                    <Text style={styles.emptyTitle}>No New notifications</Text>
                    <Text style={styles.emptySubtitle}>
                      Looks like you haven’t received any notifications.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

export const createSharedOptions = (onLogout) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return {
    headerLeft: () => (
      <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        style={{ marginLeft: 16 }}
      >
        {/* <Menu size={28} color="#000" /> */}
      </TouchableOpacity>
    ),
    headerRight: () => <NotificationBell onLogout={onLogout} />,
    tabBarShowLabel: true,
    tabBarActiveTintColor: "#007bff",
    tabBarInactiveTintColor: "gray",
    tabBarStyle: {
      height: 60 + insets.bottom,
      paddingBottom: insets.bottom,
      paddingTop: 6,
    },
  };
};

const styles = StyleSheet.create({
  bellWrap: {
    position: "relative",
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#dc3545",
    borderWidth: 2,
    borderColor: "#fff",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  iconButton: {
    padding: 6,
    borderRadius: 999,
  },
  iconButtonPlaceholder: {
    width: 34,
    height: 34,
  },
  modalBody: {
    padding: 14,
  },
  centered: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  helperText: {
    marginTop: 10,
    color: "#666",
  },
  errorText: {
    color: "#dc3545",
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  retryButtonText: { color: "#fff", fontWeight: "600" },
  notifCard: {
    backgroundColor: "#f8f9fb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  notifMeta: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
  },
  notifPreview: {
    marginTop: 8,
    fontSize: 13,
    color: "#333",
  },
  readMoreButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#007bff",
  },
  readMoreText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    maxWidth: 260,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  detailMeta: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
  },
  detailBody: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: "#222",
  },
});
