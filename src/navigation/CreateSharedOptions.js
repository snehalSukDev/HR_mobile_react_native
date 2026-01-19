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
  Image,
} from "react-native";
import { Menu, Bell } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { callFrappeMethod, fetchEmployeeDetails } from "../utils/frappeApi";
import ProfileAvatar from "../Components/ProfileAvatar";

function cleanHtmlText(input) {
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
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function parseInlineSegments(input) {
  if (!input) return [];
  const keepTags = input.replace(/<(?!\/?(strong|b)\b)[^>]*>/gi, "");
  const parts = keepTags.split(/(<\/?strong[^>]*>|<\/?b[^>]*>)/i);
  const segments = [];
  let bold = false;
  for (const p of parts) {
    if (!p) continue;
    if (/^<\s*(strong|b)\b[^>]*>$/i.test(p)) {
      bold = true;
      continue;
    }
    if (/^<\s*\/\s*(strong|b)\s*>$/i.test(p)) {
      bold = false;
      continue;
    }
    const txt = decodeEntities(p).replace(/\s+/g, " ").trim();
    if (txt) segments.push({ text: txt, bold });
  }
  return segments;
}

function SegmentedText({ raw, style, numberOfLines }) {
  const segments = parseInlineSegments(raw);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.length > 0
        ? segments.map((seg, i) => (
            <Text key={i} style={seg.bold ? styles.boldText : null}>
              {seg.text + " "}
            </Text>
          ))
        : cleanHtmlText(raw)}
    </Text>
  );
}

function NotificationBell({ onLogout, currentUserEmail }) {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notify, setNotify] = useState([]);
  const [selected, setSelected] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);

  const generalNotifications = useMemo(
    () => (notify || []).filter((item) => item?.document_type !== "Event"),
    [notify]
  );

  const hasUnread = useMemo(() => {
    const isRead = (n) => n?.read === 1 || n?.read === true || n?.read === "1";
    return (generalNotifications || []).some((n) => !isRead(n));
  }, [generalNotifications]);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!currentUserEmail) return;
      try {
        const profile = await fetchEmployeeDetails(currentUserEmail, true);
        setEmployeeProfile(profile || null);
      } catch (e) {
        // ignore header employee load errors
      }
    };
    loadEmployee();
  }, [currentUserEmail]);

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
        console.log("Notification API response:", message);
        setUserInfo(message?.user_info || null);
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
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("Home", {
            screen: "Info",
          })
        }
        style={{ marginRight: 12 }}
        activeOpacity={0.7}
      >
        <ProfileAvatar
          imagePath={
            (employeeProfile && employeeProfile.image) ||
            (userInfo && (userInfo.user_image || userInfo.image)) ||
            ""
          }
          employeeName={
            (employeeProfile && employeeProfile.employee_name) ||
            (userInfo && (userInfo.full_name || userInfo.name)) ||
            ""
          }
          size={28}
        />
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
                <SegmentedText
                  style={styles.detailTitle}
                  raw={
                    selected?.subject ||
                    selected?.document_name ||
                    "Notification"
                  }
                />
                {selected?.creation ? (
                  <Text style={styles.detailMeta}>
                    {new Date(selected.creation).toLocaleString()}
                  </Text>
                ) : null}
                <SegmentedText
                  style={styles.detailBody}
                  raw={
                    selected?.email_content ||
                    selected?.message ||
                    selected?.subject ||
                    "No content"
                  }
                />
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
                    const isRead =
                      notif?.read === 1 ||
                      notif?.read === true ||
                      notif?.read === "1";
                    return (
                      <View
                        key={notif?.name}
                        style={[
                          styles.notifCard,
                          !isRead && { borderColor: "#007bff", borderWidth: 1 },
                        ]}
                      >
                        <View style={styles.notifTopRow}>
                          <SegmentedText
                            style={styles.notifTitle}
                            numberOfLines={2}
                            raw={titleText}
                          />
                          <View
                            style={[
                              styles.statusBadge,
                              isRead
                                ? styles.statusBadgeRead
                                : styles.statusBadgeUnread,
                            ]}
                          >
                            <Text style={styles.statusBadgeText}>
                              {isRead ? "Read" : "Unread"}
                            </Text>
                          </View>
                        </View>
                        {notif?.creation ? (
                          <Text style={styles.notifMeta}>
                            {new Date(notif.creation).toLocaleString()}
                          </Text>
                        ) : null}
                        {preview ? (
                          <Text style={styles.notifPreview} numberOfLines={2}>
                            {cleanHtmlText(preview)}
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

export const createSharedOptions = (onLogout, currentUserEmail) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const logo = require("../assests/techbirdicon.png");

  return {
    headerLeft: () => (
      <View style={styles.headerLeftRow}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>
    ),
    headerLeftContainerStyle: {
      paddingLeft: 0,
      marginLeft: 0,
    },
    headerRight: () => (
      <NotificationBell
        onLogout={onLogout}
        currentUserEmail={currentUserEmail}
      />
    ),
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
  headerLeftRow: {
    marginLeft: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 4,
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
    overflow: "hidden",
  },
  notifTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    flex: 1,
    marginRight: 8,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
    flexShrink: 0,
    marginLeft: 8,
    marginTop: 2,
  },
  statusBadgeUnread: { backgroundColor: "#e7f1ff" },
  statusBadgeRead: { backgroundColor: "#f2f2f2" },
  statusBadgeText: { fontSize: 12, color: "#333", fontWeight: "600" },
  boldText: {
    fontWeight: "700",
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
