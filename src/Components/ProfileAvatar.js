// src/components/ProfileAvatar.js
import React, { useEffect, useState } from "react";
import { Image, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getFrappeBaseUrl } from "../utils/frappeApi";

const getInitials = (name = "") => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const ProfileAvatar = ({ imagePath, employeeName, size = 60 }) => {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      setLoading(true);
      setError(false);

      // No image → show initials
      if (!imagePath) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(getFrappeBaseUrl() + imagePath, {
          credentials: "include",
        });

        if (res.ok && isMounted) {
          setImageUri(res.url);
        } else {
          setError(true);
        }
      } catch (e) {
        setError(true);
      } finally {
        isMounted && setLoading(false);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [imagePath]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View
        style={[
          styles.avatar,
          styles.loader,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <ActivityIndicator size="small" color="#0C8DB6" />
      </View>
    );
  }

  /* ================= IMAGE ================= */
  if (imageUri && !error) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }

  /* ================= INITIALS ================= */
  return (
    <View
      style={[
        styles.avatar,
        styles.initialContainer,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initialText, { fontSize: size * 0.4 }]}>
        {getInitials(employeeName)}
      </Text>
    </View>
  );
};

export default ProfileAvatar;

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },

  loader: {
    backgroundColor: "#EAF6FB",
  },

  initialContainer: {
    backgroundColor: "#EAF6FB",
  },

  initialText: {
    fontWeight: "700",
    color: "#0C8DB6",
  },
});
