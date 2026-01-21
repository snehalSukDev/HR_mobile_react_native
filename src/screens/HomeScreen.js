// src/screens/HomeScreen.js

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Button,
  TextInput,
  ActivityIndicator,
  Animated,
  PanResponder,
  Alert,
  Linking,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchEmployeeDetails,
  getResourceList,
  callFrappeMethod,
  getGeolocation,
} from "../utils/frappeApi";
import { format, parseISO } from "date-fns";
import {
  Megaphone,
  CheckCircle2,
  BarChart3,
  User,
  Clock,
  Wallet,
  Bell,
  Briefcase,
  Mic,
  Search,
  Award,
  FileText,
  ClipboardList,
  Gift,
  Wallet2,
  Calendar,
  Layers,
  CalendarClock,
} from "lucide-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ProfileAvatar from "../Components/ProfileAvatar";
import { WebView } from "react-native-webview";
// import MapView, { Marker } from "react-native-maps";
export default function HomeScreen({ navigation, currentUserEmail }) {
  const isMountedRef = useRef(true);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning!";
    if (h < 17) return "Good Afternoon!";
    return "Good Evening!";
  })();
  const [punchedIn, setPunchedIn] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [pendingLogType, setPendingLogType] = useState(null);
  const sliderPos = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const knobSize = 44;
  const maxDistance = Math.max(trackWidth - knobSize, 0);
  const [coords, setCoords] = useState(null);
  // const [mapError, setMapError] = useState(false);
  // const [mapEnabled, setMapEnabled] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const effectivePunchedIn = isPunching ? pendingLogType === "IN" : punchedIn;

  const runCheck = useCallback(
    async (logType) => {
      if (!isMountedRef.current) return false;
      if (!employeeProfile?.name) return false;
      if (isPunching) return false;
      setIsPunching(true);
      setPendingLogType(logType);
      try {
        const { latitude, longitude } = await getGeolocation();
        const doc = {
          doctype: "Employee Checkin",
          employee: employeeProfile.name,
          log_type: logType,
          time: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          latitude,
          longitude,
        };
        await callFrappeMethod("frappe.desk.form.save.savedocs", {
          doc: JSON.stringify(doc),
          action: "Save",
        });
        if (isMountedRef.current) {
          Alert.alert("Success", `Checked ${logType}`);
          fetchCheckins();
        }
        return true;
      } catch (e) {
        if (isMountedRef.current) {
          const msg = e.serverMessagesText || e.message || "Check-in failed";
          Alert.alert("Error", msg);
        }
        return false;
      } finally {
        if (isMountedRef.current) {
          setIsPunching(false);
          setPendingLogType(null);
        }
      }
    },
    [employeeProfile, fetchCheckins, isPunching],
  );
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isPunching,
        onMoveShouldSetPanResponder: () => !isPunching,
        onPanResponderMove: (_, gestureState) => {
          if (isPunching) return;
          const dx = gestureState.dx;
          const base = punchedIn ? maxDistance : 0;
          const target = base + dx;
          const clamped = Math.max(0, Math.min(maxDistance, target));
          sliderPos.setValue(clamped);
        },
        onPanResponderRelease: async () => {
          if (isPunching) return;
          const current = sliderPos.__getValue();
          const threshold = maxDistance * 0.6;
          if (!punchedIn) {
            if (current >= threshold) {
              Animated.timing(sliderPos, {
                toValue: maxDistance,
                duration: 150,
                useNativeDriver: false,
              }).start(async () => {
                const ok = await runCheck("IN");
                if (ok) {
                  setPunchedIn(true);
                } else {
                  setPunchedIn(false);
                  Animated.timing(sliderPos, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: false,
                  }).start();
                }
              });
            } else {
              Animated.timing(sliderPos, {
                toValue: 0,
                duration: 150,
                useNativeDriver: false,
              }).start();
            }
          } else {
            if (current <= maxDistance * 0.4) {
              Animated.timing(sliderPos, {
                toValue: 0,
                duration: 150,
                useNativeDriver: false,
              }).start(async () => {
                const ok = await runCheck("OUT");
                if (ok) {
                  setPunchedIn(false);
                } else {
                  setPunchedIn(true);
                  Animated.timing(sliderPos, {
                    toValue: maxDistance,
                    duration: 150,
                    useNativeDriver: false,
                  }).start();
                }
              });
            } else {
              Animated.timing(sliderPos, {
                toValue: maxDistance,
                duration: 150,
                useNativeDriver: false,
              }).start();
            }
          }
        },
      }),
    [punchedIn, maxDistance, isPunching, runCheck],
  );

  const [events, setEvents] = useState({
    birthdays: [],
    anniversaries: [],
    holidays: [],
  });

  const fetchEvents = useCallback(async () => {
    if (!employeeProfile?.name) return;
    try {
      const data = await callFrappeMethod(
        "tbui_backend_core.api.events_today",
        {
          employee_id: employeeProfile.name,
        },
      );
      const message = data || {};
      if (isMountedRef.current) {
        setEvents({
          birthdays: Array.isArray(message.birthdays) ? message.birthdays : [],
          anniversaries: Array.isArray(message.work_anniversaries)
            ? message.work_anniversaries
            : [],
          holidays: Array.isArray(message.holidays) ? message.holidays : [],
        });
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  }, [employeeProfile]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const fetchProfile = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchEmployeeDetails(currentUserEmail, true);
      if (isMountedRef.current) {
        setEmployeeProfile(profile);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      if (isMountedRef.current) {
        setError(err.message || "Unknown error");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [currentUserEmail]);

  const [checkins, setCheckins] = useState([]);
  const fetchCheckins = useCallback(async () => {
    const data = await getResourceList("Employee Checkin", {
      filters: JSON.stringify([["time", "Timespan", "today"]]),
      fields: JSON.stringify(["log_type", "time"]),
      order_by: "time asc",
    });
    console.log("Checkins:", data);
    if (isMountedRef.current) {
      setCheckins(data || []);
    }
  }, []);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  useEffect(() => {
    if (checkins && checkins.length > 0) {
      const lastLog = checkins[checkins.length - 1];
      const isPunchedIn = lastLog.log_type === "IN";
      setPunchedIn(isPunchedIn);
    } else {
      setPunchedIn(false);
    }
  }, [checkins]);

  useEffect(() => {
    if (trackWidth > 0) {
      if (punchedIn) {
        sliderPos.setValue(maxDistance);
      } else {
        sliderPos.setValue(0);
      }
    }
  }, [punchedIn, maxDistance, trackWidth]);

  const lastLog = checkins?.[checkins.length - 1];
  const shouldShowCheckIn = !lastLog || lastLog.log_type === "OUT";

  const handleCheck = runCheck;

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  useEffect(() => {
    (async () => {
      try {
        const pos = await getGeolocation();
        if (
          isMountedRef.current &&
          pos &&
          typeof pos.latitude === "number" &&
          typeof pos.longitude === "number" &&
          !Number.isNaN(pos.latitude) &&
          !Number.isNaN(pos.longitude)
        ) {
          setCoords(pos);
        }
      } catch (e) {
        // ignore location failures
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#271085" />
        <Text style={{ marginTop: 10, color: "#666" }}>Loading profile...</Text>
      </View>
    );
  }

  if (!employeeProfile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noDataText}>No profile data available.</Text>
        <Button title="Reload" onPress={fetchProfile} color="#007bff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        translucent
        backgroundColor="rgba(255,255,255,0.6)"
        barStyle="dark-content"
      />
      <ScrollView style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <ProfileAvatar
              imagePath={employeeProfile.image}
              employeeName={employeeProfile.employee_name}
              size={60}
            />
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerGreeting}>{greeting}</Text>
              <Text style={styles.headerName}>
                Mr. {employeeProfile.employee_name}
              </Text>
              <Text style={styles.headerSub}>
                Last swipe:{" "}
                {lastLog?.time
                  ? `${format(parseISO(lastLog.time), "dd MMM yy, hh:mm a")}`
                  : `${format(new Date(), "dd MMM yy, hh:mm a")}`}
              </Text>
            </View>
          </View>

          {/* Location card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="location-on" size={18} color="#271085" />
              <Text style={styles.sectionTitle}>My Location</Text>
            </View>
            <View style={styles.sectionBody}>
              {coords &&
              typeof coords.latitude === "number" &&
              typeof coords.longitude === "number" &&
              !Number.isNaN(coords.latitude) &&
              !Number.isNaN(coords.longitude) ? (
                <View
                  style={{
                    height: 250,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#ddd",
                  }}
                >
                  <WebView
                    originWhitelist={["*"]}
                    source={{
                      html: `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
                          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
                          <style>
                            body { margin: 0; padding: 0; }
                            #map { height: 100vh; width: 100%; }
                          </style>
                        </head>
                        <body>
                          <div id="map"></div>
                          <script>
                            var map = L.map('map', { zoomControl: false }).setView([${coords.latitude}, ${coords.longitude}], 18);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                              maxZoom: 15,
                              attribution: '&copy; OpenStreetMap contributors'
                            }).addTo(map);
                            L.marker([${coords.latitude}, ${coords.longitude}]).addTo(map);
                          </script>
                        </body>
                      </html>
                    `,
                    }}
                    style={{ flex: 1 }}
                    scrollEnabled={false}
                  />
                </View>
              ) : (
                <Text style={styles.sectionText}>Fetching location...</Text>
              )}
            </View>
          </View>

          <View
            style={[
              styles.slideTrack,
              effectivePunchedIn
                ? {
                    backgroundColor: "#ffecec", // light red bg (Punch Out)
                    borderColor: "#EA4335", // red border
                  }
                : {
                    backgroundColor: "#e8fff0", // light green bg (Punch In)
                    borderColor: "#34A853", // green border
                  },
            ]}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          >
            {isPunching ? (
              <View style={styles.slideCenter}>
                <ActivityIndicator
                  size="small"
                  color={effectivePunchedIn ? "#EA4335" : "#34A853"}
                />
                <Text
                  style={[
                    styles.slideLoadingText,
                    { color: effectivePunchedIn ? "#EA4335" : "#34A853" },
                  ]}
                >
                  {pendingLogType === "OUT"
                    ? "Punching Out..."
                    : "Punching In..."}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.slideText,
                  { color: effectivePunchedIn ? "#EA4335" : "#34A853" },
                ]}
              >
                {effectivePunchedIn
                  ? "Slide back to Punch Out"
                  : "Slide to Punch In"}
              </Text>
            )}

            <Animated.View
              style={[
                styles.slideKnob,
                {
                  width: knobSize,
                  height: knobSize,
                  transform: [{ translateX: sliderPos }],
                  backgroundColor: effectivePunchedIn ? "#EA4335" : "#34A853",
                  opacity: isPunching ? 0.7 : 1,
                },
              ]}
              {...panResponder.panHandlers}
            >
              <MaterialIcons
                name={effectivePunchedIn ? "logout" : "login"}
                size={22}
                color="#fff"
                style={{
                  transform: effectivePunchedIn
                    ? [{ scaleX: -1 }] // 🔁 mirror ONLY for Punch Out
                    : [{ scaleX: 1 }], // ➡️ normal for Punch In
                }}
              />
            </Animated.View>
          </View>

          <View style={styles.quickDividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.quickTitle}>Quick Actions</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.quickIconRow}>
            <TouchableOpacity
              style={styles.quickIconItem}
              onPress={() => navigation.navigate("Expense Claim")}
            >
              <View style={styles.quickIconCircle}>
                <Wallet2 size={22} color="#fff" />
              </View>
              <Text style={styles.quickIconLabel}>Expense Claim</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity
              style={styles.quickIconItem}
              onPress={() => navigation.navigate("Shift")}
            >
              <View style={styles.quickIconCircle}>
                <Layers size={22} color="#fff" />
              </View>
              <Text style={styles.quickIconLabel}>Shift Roaster</Text>
            </TouchableOpacity> */}
            <TouchableOpacity
              style={styles.quickIconItem}
              onPress={() => navigation.navigate("Attendance")}
            >
              <View style={styles.quickIconCircle}>
                <Clock size={22} color="#fff" />
              </View>
              <Text style={styles.quickIconLabel}>Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickIconItem}
              onPress={() => navigation.navigate("Leave")}
            >
              <View style={styles.quickIconCircle}>
                <CalendarClock size={22} color="#fff" />
              </View>
              <Text style={styles.quickIconLabel}>Leave</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickIconItem}
              onPress={() => navigation.navigate("Announcement")}
            >
              <View style={styles.quickIconCircle}>
                <Megaphone size={22} color="#fff" />
              </View>
              <Text style={styles.quickIconLabel}>Announcement</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Gift size={18} color="#271085" />
            <Text style={styles.sectionTitle}>Birthday Reminder</Text>
          </View>
          <View style={styles.sectionBody}>
            {events.birthdays.length > 0 ? (
              events.birthdays.map((b, i) => (
                <Text key={i} style={styles.sectionText}>
                  {typeof b === "object" ? b.employee_name : b}
                </Text>
              ))
            ) : (
              <Text style={styles.sectionText}>No upcoming birthdays.</Text>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Award size={18} color="#271085" />
            <Text style={styles.sectionTitle}>Work Anniversaries</Text>
          </View>
          <View style={styles.sectionBody}>
            {events.anniversaries.length > 0 ? (
              events.anniversaries.map((a, i) => (
                <Text key={i} style={styles.sectionText}>
                  {typeof a === "object" ? a.employee_name : a}
                </Text>
              ))
            ) : (
              <Text style={styles.sectionText}>No upcoming anniversaries.</Text>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Calendar size={18} color="#271085" />
            <Text style={styles.sectionTitle}>Holidays</Text>
          </View>
          <View style={styles.sectionBody}>
            {events.holidays.length > 0 ? (
              events.holidays.map((h, i) => (
                <Text key={i} style={styles.sectionText}>
                  {typeof h === "object"
                    ? `${h.description?.replace(/<[^>]+>/g, "").trim()} (${
                        h.holiday_date
                      })`
                    : h}
                </Text>
              ))
            ) : (
              <Text style={styles.sectionText}>No upcoming holidays.</Text>
            )}
          </View>
        </View>
        {/* ... other sections ... */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  container: { flex: 1, padding: 16 },
  headerCard: {
    backgroundColor: "#213465",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTextGroup: { flexDirection: "column", marginLeft: 12, flex: 1 },
  headerGreeting: { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerName: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 2 },
  headerSub: { color: "#e6e6e6", fontSize: 12, marginTop: 2 },
  slideTrack: {
    position: "relative",
    height: 52,
    backgroundColor: "#fff",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  slideText: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: "#666",
    fontWeight: "600",
  },
  slideCenter: {
    position: "absolute",
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  slideLoadingText: {
    color: "#666",
    fontWeight: "600",
  },
  slideKnob: {
    position: "absolute",
    left: 0,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
  },
  mapButton: {
    marginTop: 10,
    backgroundColor: "#271085",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  mapButtonText: { color: "#fff", fontWeight: "600" },
  searchRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: "#333", fontSize: 14 },
  quickDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#ffffff55" },
  quickTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginHorizontal: 8,
  },
  quickIconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickIconItem: { alignItems: "center", flex: 1 },
  quickIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#5b4ed6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickIconLabel: { color: "#fff", fontSize: 12 },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  card: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  cardLabel: { marginTop: 8, fontSize: 14 },
  cardBadge: {
    backgroundColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    top: 8,
    right: 8,
  },
  badgeText: { color: "white", fontSize: 12 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    color: "#666",
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e9ecef",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#271085" },
  sectionBody: { gap: 6 },
  sectionText: { fontSize: 13, color: "#333" },
});
