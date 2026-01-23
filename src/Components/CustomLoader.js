import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Modal, Image, Animated } from "react-native";

const CustomLoader = ({ visible }) => {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      opacity.setValue(0.5);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent={true} animationType="none" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Animated.Image
            source={require("../assests/techbirdbg.png")}
            style={[styles.image, { opacity }]}
            resizeMode="contain"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: 100,
    height: 100,
  },
});

export default CustomLoader;
