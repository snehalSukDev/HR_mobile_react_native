import React from "react";
import { TouchableOpacity } from "react-native";
import { Menu, Bell } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

export const createSharedOptions = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return {
    headerLeft: () => (
      <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        style={{ marginLeft: 16 }}
      >
        <Menu size={28} color="#000" />
      </TouchableOpacity>
    ),
    headerRight: () => (
      <TouchableOpacity
        onPress={() => alert("Notifications")}
        style={{ marginRight: 16 }}
      >
        <Bell size={24} color="#000" />
      </TouchableOpacity>
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
