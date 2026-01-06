// src/components/ProfileAvatar.js
import React, { useState, useEffect } from "react";
import { Image, View, ActivityIndicator, StyleSheet } from "react-native";
// import { API_HOST } from "@/config";

const ProfileAvatar = ({ imagePath, employeeName, size = 100 }) => {
  const API_HOST = "https://glsdemo.techbirdit.in";

  const [uri, setUri] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveImage() {
      setLoading(true);

      // No image? Show placeholder with initial
      if (!imagePath) {
        setUri(
          `https://placehold.co/${size}x${size}/A0D9FF/007bff?text=${
            employeeName ? employeeName.charAt(0) : "?"
          }`
        );
        setLoading(false);
        return;
      }

      try {
        // Fetch the controller route so cookies are included
        const res = await fetch(API_HOST + imagePath, {
          credentials: "include",
          method: "GET",
          redirect: "follow",
        });
        if (res.ok) {
          // res.url → final S3 presigned URL
          setUri(res.url);
        } else {
          console.warn("Image fetch failed status:", res.status);
        }
      } catch (err) {
        console.error("Error resolving image URL:", err);
      } finally {
        setLoading(false);
      }
    }

    resolveImage();
  }, [imagePath, employeeName, size]);

  if (loading) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[
        styles.image,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: "#eee",
  },
  placeholder: {
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ProfileAvatar;
