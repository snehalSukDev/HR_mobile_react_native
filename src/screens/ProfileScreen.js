import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Button,
  TouchableOpacity,
  RefreshControl,
  InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import { useTheme } from "../context/ThemeContext";
import Toast from "react-native-toast-message";
import CustomLoader from "../Components/CustomLoader";
import {
  getResourceList,
  fetchEmployeeDetails,
  callFrappeMethod,
  getGeolocation,
} from "../utils/frappeApi";
import ProfileAvatar from "../Components/ProfileAvatar";
import {
  Hand,
  User,
  Calendar,
  Layers,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Calendar1,
  User2,
  Droplet,
  ChevronDown,
  Briefcase,
  ShieldAlert,
} from "lucide-react-native";

const TABS = ["Details"];

const ProfileScreen = ({ currentUserEmail, onLogout }) => {
  const { colors, theme } = useTheme();
  const isMountedRef = useRef(true);

  const dynamicStyles = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      centered: { backgroundColor: colors.background },
      text: { color: colors.text },
      textSecondary: { color: colors.textSecondary },
      profileCard: { backgroundColor: colors.card, borderColor: colors.border },
      employeeName: { color: colors.text },
      employeeDesignation: { color: colors.textSecondary },
      employeeId: { color: colors.textSecondary },
      tabBar: { borderColor: colors.border },
      detailItem: { backgroundColor: colors.card, borderColor: colors.border },
      detailLabel: { color: colors.textSecondary },
      detailValue: { color: colors.text },
      detailIcon: { backgroundColor: theme === "dark" ? "#333" : "#EAF6FB" },
      aboutCard: { backgroundColor: colors.card },
      aboutTitle: { color: colors.text },
      aboutContent: { borderTopColor: colors.border },
      aboutItem: { backgroundColor: theme === "dark" ? "#2c2c2c" : "#F8F9FA" },
      loadingText: { color: colors.textSecondary },
    }),
    [colors, theme],
  );

  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("Details");
  const [aboutOpen, setAboutOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchProfile = useCallback(
    async (forceRefresh = false) => {
      if (!isMountedRef.current) return;
      setLoading(true);
      try {
        const profile = await fetchEmployeeDetails(
          currentUserEmail,
          true,
          forceRefresh,
        );
        if (isMountedRef.current) {
          setEmployeeProfile(profile);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message || "Unknown error");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [currentUserEmail],
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      InteractionManager.runAfterInteractions(() => {
        if (employeeProfile?.name) {
          fetchCheckins();
        }
      });
    }, [employeeProfile?.name, fetchCheckins]),
  );

  const [checkins, setCheckins] = useState([]);
  const fetchCheckins = useCallback(
    async (forceRefresh = false) => {
      if (!employeeProfile?.name) return;
      const data = await getResourceList("Employee Checkin", {
        filters: JSON.stringify([
          ["employee", "=", employeeProfile.name],
          ["time", "Timespan", "today"],
        ]),
        fields: JSON.stringify(["log_type"]),
        order_by: "time asc",
        cache: true,
        cacheTTL: 5 * 60 * 1000, // 5 minutes
        forceRefresh: forceRefresh,
      });
      if (isMountedRef.current) {
        setCheckins(data || []);
      }
    },
    [employeeProfile?.name],
  );

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  const lastLog = checkins?.[checkins.length - 1];
  const shouldShowCheckIn = !lastLog || lastLog.log_type === "OUT";

  const handleCheck = async (logType) => {
    try {
      // Add timeout for geolocation
      const locationPromise = getGeolocation();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Location timeout")), 10000),
      );

      const { latitude, longitude } = await Promise.race([
        locationPromise,
        timeoutPromise,
      ]);

      const doc = {
        doctype: "Employee Checkin",
        employee: employeeProfile?.name,
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
        Toast.show({
          type: "success",
          text1: "Success",
          text2: `Checked ${logType}`,
        });
      }
      fetchCheckins(true); // Force refresh checkins after checkin
    } catch (e) {
      if (isMountedRef.current) {
        Toast.show({ type: "error", text1: "Error", text2: "Check-in failed" });
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchProfile(true), fetchCheckins(true)]);
    } catch (e) {
      console.error(e);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [fetchProfile, fetchCheckins]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["left", "right"]}
    >
      <CustomLoader visible={loading} />
      {!loading && !employeeProfile ? (
        <View style={[styles.centered, dynamicStyles.centered]}>
          <Text style={dynamicStyles.text}>No profile data</Text>
          <Button title="Retry" onPress={() => fetchProfile(false)} />
        </View>
      ) : !loading && employeeProfile ? (
        <ScrollView
          contentContainerStyle={[styles.container, dynamicStyles.container]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* ... existing scrollview content ... */}
          <View style={[styles.profileCard, dynamicStyles.profileCard]}>
            {/* ================= HEADER ================= */}
            <View style={styles.profileHeader}>
              <ProfileAvatar
                imagePath={employeeProfile.image}
                employeeName={employeeProfile.employee_name}
                size={60}
              />

              <View style={styles.profileInfo}>
                <Text style={[styles.employeeName, dynamicStyles.employeeName]}>
                  {employeeProfile.employee_name}
                </Text>
                <Text
                  style={[
                    styles.employeeDesignation,
                    dynamicStyles.employeeDesignation,
                  ]}
                >
                  {employeeProfile.designation}
                </Text>
                <Text style={[styles.employeeId, dynamicStyles.employeeId]}>
                  {employeeProfile.name}
                </Text>
              </View>
            </View>

            {/* ================= TABS ================= */}
            <View style={[styles.tabBar, dynamicStyles.tabBar]}></View>

            {/* ================= TAB CONTENT ================= */}
            {activeTab === "Details" && (
              <View style={styles.detailsGrid}>
                <View style={[styles.detailItem, dynamicStyles.detailItem]}>
                  <View style={styles.detailRow}>
                    {/* Icon */}
                    <View style={[styles.detailIcon, dynamicStyles.detailIcon]}>
                      <Mail size={14} color="#0C8DB6" />
                    </View>

                    {/* Text */}
                    <View style={styles.detailText}>
                      <Text
                        style={[styles.detailLabel, dynamicStyles.detailLabel]}
                      >
                        Email
                      </Text>
                      <Text
                        style={[styles.detailValue, dynamicStyles.detailValue]}
                      >
                        {employeeProfile.user_id || "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailItem, dynamicStyles.detailItem]}>
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIcon, dynamicStyles.detailIcon]}>
                      <Phone size={14} color="#0C8DB6" />
                    </View>

                    <View style={styles.detailText}>
                      <Text
                        style={[styles.detailLabel, dynamicStyles.detailLabel]}
                      >
                        Phone
                      </Text>
                      <Text
                        style={[styles.detailValue, dynamicStyles.detailValue]}
                      >
                        {employeeProfile.cell_number || "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailItem, dynamicStyles.detailItem]}>
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIcon, dynamicStyles.detailIcon]}>
                      <Building2 size={14} color="#0C8DB6" />
                    </View>

                    <View style={styles.detailText}>
                      <Text
                        style={[styles.detailLabel, dynamicStyles.detailLabel]}
                      >
                        Department
                      </Text>
                      <Text
                        style={[styles.detailValue, dynamicStyles.detailValue]}
                      >
                        {employeeProfile.department || "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailItem, dynamicStyles.detailItem]}>
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIcon, dynamicStyles.detailIcon]}>
                      <Building2 size={14} color="#0C8DB6" />
                    </View>

                    <View style={styles.detailText}>
                      <Text
                        style={[styles.detailLabel, dynamicStyles.detailLabel]}
                      >
                        Company
                      </Text>
                      <Text
                        style={[styles.detailValue, dynamicStyles.detailValue]}
                      >
                        {employeeProfile.company || "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailItem, dynamicStyles.detailItem]}>
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIcon, dynamicStyles.detailIcon]}>
                      <Calendar1 size={14} color="#0C8DB6" />
                    </View>

                    <View style={styles.detailText}>
                      <Text
                        style={[styles.detailLabel, dynamicStyles.detailLabel]}
                      >
                        Date of Joining
                      </Text>
                      <Text
                        style={[styles.detailValue, dynamicStyles.detailValue]}
                      >
                        {employeeProfile.date_of_joining
                          ? new Date(
                              employeeProfile.date_of_joining,
                            ).toDateString()
                          : "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailItem, dynamicStyles.detailItem]}>
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIcon, dynamicStyles.detailIcon]}>
                      <User2 size={14} color="#0C8DB6" />
                    </View>

                    <View style={styles.detailText}>
                      <Text
                        style={[styles.detailLabel, dynamicStyles.detailLabel]}
                      >
                        Gender
                      </Text>
                      <Text
                        style={[styles.detailValue, dynamicStyles.detailValue]}
                      >
                        {employeeProfile.gender || "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailItem, dynamicStyles.detailItem]}>
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIcon, dynamicStyles.detailIcon]}>
                      <Droplet size={14} color="#0C8DB6" />
                    </View>

                    <View style={styles.detailText}>
                      <Text
                        style={[styles.detailLabel, dynamicStyles.detailLabel]}
                      >
                        Blood Group
                      </Text>
                      <Text
                        style={[styles.detailValue, dynamicStyles.detailValue]}
                      >
                        {employeeProfile.blood_group || "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {activeTab !== "Details" && (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>
                  {activeTab} content coming soon
                </Text>
              </View>
            )}

            {/* About Me Accordion */}
            <View style={[styles.aboutCard, dynamicStyles.aboutCard]}>
              <TouchableOpacity
                style={styles.aboutHeader}
                onPress={() => setAboutOpen(!aboutOpen)}
                activeOpacity={0.8}
              >
                <Text style={[styles.aboutTitle, dynamicStyles.aboutTitle]}>
                  About Me
                </Text>

                <ChevronDown
                  size={18}
                  color="#0C8DB6"
                  style={{
                    transform: [{ rotate: aboutOpen ? "180deg" : "0deg" }],
                  }}
                />
              </TouchableOpacity>

              {aboutOpen && (
                <View style={[styles.aboutContent, dynamicStyles.aboutContent]}>
                  {/* Employment Type */}
                  <View style={[styles.aboutItem, dynamicStyles.aboutItem]}>
                    <View style={[styles.detailIcon, dynamicStyles.detailIcon]}>
                      <Briefcase size={14} color="#0C8DB6" />
                    </View>

                    <View style={styles.detailText}>
                      <Text
                        style={[styles.detailLabel, dynamicStyles.detailLabel]}
                      >
                        Employment Type
                      </Text>
                      <Text
                        style={[styles.detailValue, dynamicStyles.detailValue]}
                      >
                        {employeeProfile.employment_type || "N/A"}
                      </Text>
                    </View>
                  </View>

                  {/* Emergency Contact Name */}
                  <View style={[styles.aboutItem, dynamicStyles.aboutItem]}>
                    <View style={[styles.detailIcon, dynamicStyles.detailIcon]}>
                      <User2 size={14} color="#D97706" />
                    </View>

                    <View style={styles.detailText}>
                      <Text
                        style={[styles.detailLabel, dynamicStyles.detailLabel]}
                      >
                        Emergency Contact Name
                      </Text>
                      <Text
                        style={[styles.detailValue, dynamicStyles.detailValue]}
                      >
                        {employeeProfile.person_to_be_contacted || "N/A"}
                      </Text>
                    </View>
                  </View>

                  {/* Emergency Contact Number */}
                  <View style={[styles.aboutItem, dynamicStyles.aboutItem]}>
                    <View style={[styles.detailIcon, dynamicStyles.detailIcon]}>
                      <ShieldAlert size={14} color="#DC2626" />
                    </View>

                    <View style={styles.detailText}>
                      <Text
                        style={[styles.detailLabel, dynamicStyles.detailLabel]}
                      >
                        Emergency Contact Number
                      </Text>
                      <Text
                        style={[styles.detailValue, dynamicStyles.detailValue]}
                      >
                        {employeeProfile.emergency_phone_number || "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f5f7fa" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e9ecef",
  },

  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  profileInfo: { flex: 1, marginLeft: 12 },

  employeeName: { fontSize: 16, fontWeight: "600" },
  employeeDesignation: { fontSize: 13, color: "#555" },
  employeeId: { fontSize: 12, color: "#888" },

  punchInButton: {
    flexDirection: "row",
    backgroundColor: "#EAF6FB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  punchInText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#0C8DB6",
  },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
    marginBottom: 16,
  },

  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 12, // 👈 spacing from left
    alignItems: "flex-start", // 👈 left align text
  },

  activeTab: {
    borderBottomWidth: 2,
    borderColor: "#0C8DB6",
  },

  tabText: {
    fontSize: 13,
    color: "#777",
    textAlign: "left",
  },

  activeTabText: {
    color: "#0C8DB6",
    fontWeight: "600",
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  detailItem: {
    width: "48%",
    marginBottom: 14,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  detailIcon: {
    width: 24,
    height: 24,
    borderRadius: 18,
    backgroundColor: "#EAF6FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  detailText: {
    flex: 1,
  },

  detailLabel: { fontSize: 12, color: "#888" },
  detailValue: { fontSize: 14, fontWeight: "500", marginTop: 4 },

  placeholder: {
    padding: 30,
    alignItems: "center",
  },

  placeholderText: {
    color: "#888",
    fontSize: 14,
  },
  aboutCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },

  aboutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  aboutTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  aboutToggle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0C8DB6",
  },

  aboutText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },

  aboutContent: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },

  aboutItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
});
