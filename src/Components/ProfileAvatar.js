// src/components/ProfileAvatar.js
import React, { useEffect, useState, useMemo } from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import { getFrappeBaseUrl } from "../utils/frappeApi";
import { useTheme } from "../context/ThemeContext";
import CustomLoader from "./CustomLoader";

const getInitials = (name = "") => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const ProfileAvatar = ({ imagePath, employeeName, size = 60 }) => {
  const { colors, theme } = useTheme();
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const dynamicStyles = useMemo(
    () => ({
      loader: { backgroundColor: colors.background },
      initialContainer: {
        backgroundColor: theme === "dark" ? "#333" : "#e0e0e0",
        borderColor: colors.border,
      },
      initials: { color: colors.textSecondary },
    }),
    [colors, theme],
  );

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
        const raw = String(imagePath || "").trim();
        // If imagePath is already a full URL, use it directly
        if (/^https?:\/\//i.test(raw)) {
          if (isMounted) {
            setImageUri(raw);
          }
          return;
        }

        const base = getFrappeBaseUrl();
        if (!base) {
          setError(true);
          return;
        }
        const url = `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
        const encoded = encodeURI(url);
        if (isMounted) {
          setImageUri(encoded);
        }
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
          dynamicStyles.loader,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <CustomLoader visible={true} />
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
        onError={() => setError(true)}
      />
    );
  }

  /* ================= INITIALS ================= */
  return (
    <View
      style={[
        styles.avatar,
        styles.initialContainer,
        dynamicStyles.initialContainer,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text
        style={[
          styles.initialText,
          dynamicStyles.initialText,
          { fontSize: size * 0.4 },
        ]}
      >
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
