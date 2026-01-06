// src/screens/NotificationScreen.js

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Button,
  Alert,
} from "react-native";

const NotificationScreen = ({
  currentUserEmail,
  currentEmployeeId,
  onLogout,
}) => {
  const handleLogoutPress = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: onLogout, style: "destructive" },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Notification Screen</Text>
      </View>

      {/* Your notification list would go here */}

      {/* <View style={styles.logoutButtonContainer}>
        <Button title="Logout" onPress={handleLogoutPress} color="#dc3545" />
      </View> */}
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
});

export default NotificationScreen;
