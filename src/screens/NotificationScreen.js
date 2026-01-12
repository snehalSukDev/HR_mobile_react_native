// src/screens/NotificationScreen.js

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BellOff } from "lucide-react-native";
import { callFrappeMethod } from "../utils/frappeApi";

const NotificationScreen = ({
  currentUserEmail,
  currentEmployeeId,
  onLogout,
}) => {
  const [notify, setNotify] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setError(null);
    try {
      const message = await callFrappeMethod(
        "frappe.desk.doctype.notification_log.notification_log.get_notification_logs"
      );
      setNotify(message?.notification_logs || []);
      setUserInfo(message?.user_info || null);
    } catch (e) {
      setNotify([]);
      setUserInfo(null);
      setError(e?.message || "Failed to load notifications");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        await fetchNotifications();
        if (alive) setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [fetchNotifications])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const toggleNotificationRead = useCallback(async (notif) => {
    const isRead = Boolean(notif?.read);
    const method = isRead
      ? "frappe.desk.doctype.notification_log.notification_log.mark_as_unread"
      : "frappe.desk.doctype.notification_log.notification_log.mark_as_read";
    try {
      await callFrappeMethod(method, { notification_log: notif?.name });
      setNotify((prev) =>
        prev.map((n) =>
          n?.name === notif?.name ? { ...n, read: isRead ? 0 : 1 } : n
        )
      );
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to update notification");
    }
  }, []);

  const generalNotifications = useMemo(
    () => (notify || []).filter((item) => item?.document_type !== "Event"),
    [notify]
  );

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
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.helperText}>Loading notifications...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : generalNotifications.length > 0 ? (
        generalNotifications.map((notif) => {
          const title =
            notif?.subject ||
            notif?.email_content ||
            notif?.document_name ||
            notif?.name ||
            "Notification";
          const created = notif?.creation
            ? new Date(notif.creation).toLocaleString()
            : "";
          const isRead = Boolean(notif?.read);
          return (
            <TouchableOpacity
              key={notif?.name}
              style={[
                styles.card,
                !isRead && { borderColor: "#007bff", borderWidth: 1 },
              ]}
              onPress={() => toggleNotificationRead(notif)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {title}
                </Text>
                <View
                  style={[
                    styles.badge,
                    isRead ? styles.badgeRead : styles.badgeUnread,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {isRead ? "Read" : "Unread"}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>
                {(notif?.document_type || "General") +
                  (created ? ` • ${created}` : "")}
              </Text>
              {userInfo?.name ? (
                <Text style={styles.cardMeta}>User: {userInfo.name}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <BellOff color="red" size={60} />
          <Text style={styles.emptyTitle}>No New notifications</Text>
          <Text style={styles.emptySubtitle}>
            Looks like you haven’t received any notifications.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    padding: 15,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  centered: {
    flex: 1,
    paddingVertical: 30,
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    color: "#111",
    fontSize: 14,
    fontWeight: "600",
  },
  cardMeta: {
    color: "#666",
    fontSize: 12,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeUnread: { backgroundColor: "#e7f1ff" },
  badgeRead: { backgroundColor: "#f2f2f2" },
  badgeText: { fontSize: 12, color: "#333", fontWeight: "600" },
  emptyState: {
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    maxWidth: 260,
  },
});

export default NotificationScreen;
