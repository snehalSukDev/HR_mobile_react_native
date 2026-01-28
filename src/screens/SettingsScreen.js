// src/screens/SettingsScreen.js

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Button,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

const SettingsScreen = ({ currentUserEmail, currentEmployeeId, onLogout }) => {
  const { colors, theme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const dynamicStyles = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      sectionTitle: { color: colors.text },
      cancelButton: {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
      },
      cancelButtonText: {
        color: colors.text,
      },
      modalCard: {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      modalText: {
        color: colors.textSecondary,
      },
      modalTitle: {
        color: colors.text,
      },
    }),
    [colors],
  );

  const handleLogoutPress = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <ScrollView
      style={[styles.container, dynamicStyles.container]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Setting Screen</Text>
      </View> */}

      {/* Your notification list would go here */}

      <View style={styles.logoutButtonContainer}>
        <Button title="Logout" onPress={handleLogoutPress} color="#dc3545" />
      </View>

      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, dynamicStyles.modalCard]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Logout
            </Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Are you sure you want to log out?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, dynamicStyles.cancelButton]}
                onPress={cancelLogout}
              >
                <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.logoutButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  logoutButtonContainer: {
    marginTop: 20,
    alignSelf: "center",
    width: "80%",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: "#e0e0e0",
  },
  logoutButton: {
    backgroundColor: "#dc3545",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default SettingsScreen;
