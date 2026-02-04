import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";

const CustomLoader = ({ visible, onClose }) => {
  const [internalVisible, setInternalVisible] = useState(visible);
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    setInternalVisible(visible);
  }, [visible]);

  useEffect(() => {
    if (internalVisible) {
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
  }, [internalVisible, opacity]);

  const handleClose = () => {
    setInternalVisible(false);
    if (onClose) onClose();
  };

  if (!internalVisible) return null;

  return (
    <Modal
      transparent={true}
      animationType="none"
      visible={internalVisible}
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableWithoutFeedback>
          <View style={styles.container}>
            <Animated.Image
              source={require("../assests/techbirdbg.png")}
              style={[styles.image, { opacity }]}
              resizeMode="contain"
            />
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
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
