import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Button,
  Alert,
  TouchableOpacity,
} from "react-native";
import { format } from "date-fns";
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
  const isMountedRef = useRef(true);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("Details");
  const [aboutOpen, setAboutOpen] = useState(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      const profile = await fetchEmployeeDetails(currentUserEmail, true);
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
  }, [currentUserEmail]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const [checkins, setCheckins] = useState([]);
  const fetchCheckins = useCallback(async () => {
    const data = await getResourceList("Employee Checkin", {
      filters: JSON.stringify([["time", "Timespan", "today"]]),
      fields: JSON.stringify(["log_type"]),
      order_by: "time asc",
    });
    if (isMountedRef.current) {
      setCheckins(data || []);
    }
  }, []);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  const lastLog = checkins?.[checkins.length - 1];
  const shouldShowCheckIn = !lastLog || lastLog.log_type === "OUT";

  const handleCheck = async (logType) => {
    try {
      const { latitude, longitude } = await getGeolocation();
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
        Alert.alert("Success", `Checked ${logType}`);
      }
      fetchCheckins();
    } catch (e) {
      if (isMountedRef.current) {
        Alert.alert("Error", "Check-in failed");
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!employeeProfile) {
    return (
      <View style={styles.centered}>
        <Text>No profile data</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileCard}>
        {/* ================= HEADER ================= */}
        <View style={styles.profileHeader}>
          <ProfileAvatar
            imagePath={employeeProfile.image}
            employeeName={employeeProfile.employee_name}
            size={60}
          />

          <View style={styles.profileInfo}>
            <Text style={styles.employeeName}>
              {employeeProfile.employee_name}
            </Text>
            <Text style={styles.employeeDesignation}>
              {employeeProfile.designation}
            </Text>
            <Text style={styles.employeeId}>{employeeProfile.name}</Text>
          </View>

          {/* <TouchableOpacity
            style={styles.punchInButton}
            onPress={() => handleCheck(shouldShowCheckIn ? "IN" : "OUT")}
          >
            <Hand size={16} color="#0C8DB6" />
            <Text style={styles.punchInText}>
              {shouldShowCheckIn ? "Check In" : "Check Out"}
            </Text>
          </TouchableOpacity> */}
        </View>

        {/* ================= TABS ================= */}
        <View style={styles.tabBar}></View>

        {/* ================= TAB CONTENT ================= */}
        {activeTab === "Details" && (
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                {/* Icon */}
                <View style={styles.detailIcon}>
                  <Mail size={14} color="#0C8DB6" />
                </View>

                {/* Text */}
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>
                    {employeeProfile.user_id || "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Phone size={14} color="#0C8DB6" />
                </View>

                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>
                    {employeeProfile.cell_number || "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Building2 size={14} color="#0C8DB6" />
                </View>

                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Department</Text>
                  <Text style={styles.detailValue}>
                    {employeeProfile.department || "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Building2 size={14} color="#0C8DB6" />
                </View>

                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Company</Text>
                  <Text style={styles.detailValue}>
                    {employeeProfile.company || "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Calendar1 size={14} color="#0C8DB6" />
                </View>

                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Date of Joining</Text>
                  <Text style={styles.detailValue}>
                    {employeeProfile.date_of_joining
                      ? new Date(employeeProfile.date_of_joining).toDateString()
                      : "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <User2 size={14} color="#0C8DB6" />
                </View>

                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>
                    {employeeProfile.gender || "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Droplet size={14} color="#0C8DB6" />
                </View>

                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Blood Group</Text>
                  <Text style={styles.detailValue}>
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
        <View style={styles.aboutCard}>
          <TouchableOpacity
            style={styles.aboutHeader}
            onPress={() => setAboutOpen(!aboutOpen)}
            activeOpacity={0.8}
          >
            <Text style={styles.aboutTitle}>About Me</Text>

            <ChevronDown
              size={18}
              color="#0C8DB6"
              style={{
                transform: [{ rotate: aboutOpen ? "180deg" : "0deg" }],
              }}
            />
          </TouchableOpacity>

          {aboutOpen && (
            <View style={styles.aboutContent}>
              {/* Employment Type */}
              <View style={styles.aboutItem}>
                <View style={styles.detailIcon}>
                  <Briefcase size={14} color="#0C8DB6" />
                </View>

                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Employment Type</Text>
                  <Text style={styles.detailValue}>
                    {employeeProfile.employment_type || "N/A"}
                  </Text>
                </View>
              </View>

              {/* Emergency Contact Name */}
              <View style={styles.aboutItem}>
                <View style={styles.detailIcon}>
                  <User2 size={14} color="#D97706" />
                </View>

                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Emergency Contact Name</Text>
                  <Text style={styles.detailValue}>
                    {employeeProfile.person_to_be_contacted || "N/A"}
                  </Text>
                </View>
              </View>

              {/* Emergency Contact Number */}
              <View style={styles.aboutItem}>
                <View style={styles.detailIcon}>
                  <ShieldAlert size={14} color="#DC2626" />
                </View>

                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>
                    Emergency Contact Number
                  </Text>
                  <Text style={styles.detailValue}>
                    {employeeProfile.emergency_phone_number || "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
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
