import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";

const safeDate = (val) => {
  const d = val ? new Date(val) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
};

const GenericField = ({ field, value, onFieldChange, error }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Helper to handle simple text changes
  const handleChange = (val) => {
    onFieldChange(field.fieldname, val);
  };

  if (field.fieldtype === "Check") {
    const isChecked = !!value;
    return (
      <View style={styles.container}>
        <Text style={styles.label}>
          {field.label} {field.reqd ? "*" : ""}
        </Text>
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => handleChange(!isChecked)}
        >
          <MaterialIcons
            name={isChecked ? "check-box" : "check-box-outline-blank"}
            size={24}
            color="#007bff"
          />
          <Text style={styles.checkLabel}>{field.label}</Text>
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
        <Text style={styles.label}>
          {field.label} {field.reqd ? "*" : ""}
        </Text>
        <View style={[styles.selectContainer, error && styles.inputError]}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.optionPill,
                value === opt && styles.optionPillActive,
              ]}
              onPress={() => handleChange(opt)}
            >
              <Text
                style={[
                  styles.optionText,
                  value === opt && styles.optionTextActive,
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
        <Text style={styles.label}>
          {field.label} {field.reqd ? "*" : ""}
        </Text>
        <TouchableOpacity
          style={[styles.input, error && styles.inputError]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: value ? "#333" : "#999" }}>
            {value ? String(value) : "Select date"}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            mode="date"
            value={safeDate(value)}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                const formatted = format(selectedDate, "yyyy-MM-dd");
                handleChange(formatted);
              }
            }}
          />
        )}
      </View>
    );
  }

  // Text, Data, Int, Float, Currency, Small Text
  const isNumeric = ["Int", "Float", "Currency"].includes(field.fieldtype);
  const isMultiline = ["Small Text", "Text"].includes(field.fieldtype);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {field.label} {field.reqd ? "*" : ""}
      </Text>
      <TextInput
        style={[
            styles.input, 
            error && styles.inputError,
            isMultiline && styles.textArea
        ]}
        value={value == null ? "" : String(value)}
        onChangeText={handleChange}
        placeholder={field.placeholder || field.label}
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
      textAlignVertical: 'top'
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
});

export default React.memo(GenericField);
