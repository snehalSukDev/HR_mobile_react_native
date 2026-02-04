import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useTheme } from "../../context/ThemeContext";

const safeDate = (val) => {
  const d = val ? new Date(val) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
};

const GenericField = ({ field, value, onFieldChange, error }) => {
  const { colors, theme } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dynamicStyles = useMemo(
    () => ({
      label: { color: colors.text },
      input: {
        borderColor: colors.border,
        backgroundColor: colors.card,
        color: colors.text,
      },
      checkLabel: { color: colors.text },
      optionPill: {
        backgroundColor: theme === "dark" ? "#333" : "#f0f0f0",
        borderColor: colors.border,
      },
      optionPillActive: {
        backgroundColor: theme === "dark" ? "#0056b3" : "#e6f0ff",
        borderColor: colors.primary,
      },
      optionText: { color: colors.textSecondary },
      optionTextActive: { color: colors.primary },
      dateText: { color: value ? colors.text : colors.textSecondary },
      placeholder: colors.textSecondary,
    }),
    [colors, theme, value],
  );

  // Helper to handle simple text changes
  const handleChange = (val) => {
    onFieldChange(field.fieldname, val);
  };

  if (field.fieldtype === "Check") {
    const isChecked = !!value;
    return (
      <View style={styles.container}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {field.label} {field.reqd ? "*" : ""}
        </Text>
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => handleChange(!isChecked)}
        >
          <MaterialIcons
            name={isChecked ? "check-box" : "check-box-outline-blank"}
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.checkLabel, dynamicStyles.checkLabel]}>
            {field.label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (field.fieldtype === "Select") {
    const options =
      typeof field.options === "string"
        ? field.options.split("\n").filter(Boolean)
        : [];

    if (options.length === 0) return null;

    return (
      <View style={styles.container}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {field.label} {field.reqd ? "*" : ""}
        </Text>
        <View style={[styles.selectContainer, error && styles.inputError]}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.optionPill,
                dynamicStyles.optionPill,
                value === opt && [
                  styles.optionPillActive,
                  dynamicStyles.optionPillActive,
                ],
              ]}
              onPress={() => handleChange(opt)}
            >
              <Text
                style={[
                  styles.optionText,
                  dynamicStyles.optionText,
                  value === opt && [
                    styles.optionTextActive,
                    dynamicStyles.optionTextActive,
                  ],
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  if (field.fieldtype === "Date") {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, dynamicStyles.label]}>
          {field.label} {field.reqd ? "*" : ""}
        </Text>
        <TouchableOpacity
          style={[
            styles.input,
            dynamicStyles.input,
            error && styles.inputError,
          ]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={dynamicStyles.dateText}>
            {value ? String(value) : "Select date"}
          </Text>
        </TouchableOpacity>
        {showDatePicker &&
          (Platform.OS === "ios" ? (
            <Modal
              transparent
              animationType="fade"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => setShowDatePicker(false)}
              >
                <View
                  style={[
                    styles.iosDatePickerContainer,
                    { backgroundColor: theme === "dark" ? "#1E1E1E" : "#fff" },
                  ]}
                >
                  <View
                    style={[
                      styles.iosDatePickerHeader,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text
                        style={[
                          styles.doneButtonText,
                          { color: colors.primary || "#007bff" },
                        ]}
                      >
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    mode="date"
                    value={safeDate(value)}
                    display="spinner"
                    themeVariant={theme}
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        const formatted = format(selectedDate, "yyyy-MM-dd");
                        handleChange(formatted);
                      }
                    }}
                    style={{ height: 200 }}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          ) : (
            <DateTimePicker
              mode="date"
              value={safeDate(value)}
              display="default"
              themeVariant={theme}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate && event.type !== "dismissed") {
                  const formatted = format(selectedDate, "yyyy-MM-dd");
                  handleChange(formatted);
                }
              }}
            />
          ))}
      </View>
    );
  }

  // Text, Data, Int, Float, Currency, Small Text
  const isNumeric = ["Int", "Float", "Currency"].includes(field.fieldtype);
  const isMultiline = [
    "Small Text",
    "Text",
    "Text Editor",
    "Long Text",
    "HTML Editor",
    "Code",
    "Markdown Editor",
    "Rich Text",
  ].includes(field.fieldtype);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, dynamicStyles.label]}>
        {field.label} {field.reqd ? "*" : ""}
      </Text>
      <TextInput
        style={[
          styles.input,
          dynamicStyles.input,
          error && styles.inputError,
          isMultiline && styles.textArea,
        ]}
        value={value == null ? "" : String(value)}
        onChangeText={handleChange}
        placeholder={field.placeholder || field.label}
        placeholderTextColor={dynamicStyles.placeholder}
        keyboardType={isNumeric ? "numeric" : "default"}
        multiline={isMultiline}
        numberOfLines={isMultiline ? 3 : 1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#333",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "red",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  checkLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
  },
  selectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 8,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  optionPillActive: {
    backgroundColor: "#e6f0ff",
    borderColor: "#007bff",
  },
  optionText: {
    fontSize: 13,
    color: "#666",
  },
  optionTextActive: {
    color: "#007bff",
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  iosDatePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 20,
  },
  iosDatePickerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007bff",
  },
});

export default React.memo(GenericField);
