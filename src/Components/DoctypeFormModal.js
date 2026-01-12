import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { getMetaData, fnSearchLink, saveDoc } from "../utils/frappeApi";
import { Formik } from "formik";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { Alert } from "react-native";

const DoctypeFormModal = ({ visible, onClose, doctype, title }) => {
  const [fields, setFields] = useState([]);
  const [linkResults, setLinkResults] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [datePickerField, setDatePickerField] = useState(null);

  useEffect(() => {
    async function loadMeta() {
      if (!visible) return;
      const res = await getMetaData(doctype);
      const filtered = (res.fields || []).filter(
        (f) =>
          [
            "Data",
            "Date",
            "Int",
            "Float",
            "Select",
            "Link",
            "Check",
            "Small Text",
            "Text",
          ].includes(f.fieldtype) && !f.hidden
      );
      setFields(filtered);
    }
    loadMeta();
  }, [visible, doctype]);

  const initialValues = {};
  fields.forEach((f) => {
    initialValues[f.fieldname] = "";
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title || doctype}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>
          <Formik
            initialValues={initialValues}
            enableReinitialize
            onSubmit={async (values, { setSubmitting }) => {
              const tempName = `new-${doctype
                .toLowerCase()
                .replace(/ /g, "-")}-${Date.now()}`;
              console.log("onSubmit", values);
              try {
                const doc = {
                  ...values,

                  // Required Frappe meta
                  doctype,
                  name: tempName,
                  docstatus: 0,
                  __islocal: 1,
                  __unsaved: 1,

                  // Optional but recommended
                  // owner: "hrmanager@test.com",
                  posting_date: format(new Date(), "yyyy-MM-dd"),
                  // status: "Open",
                };

                await saveDoc(doc);

                Alert.alert("Success", `${doctype} saved successfully`);
                onClose();
              } catch (err) {
                Alert.alert("Error", err.message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ values, setFieldValue, handleSubmit }) => (
              <>
                <ScrollView style={styles.modalBody}>
                  {fields.length === 0 ? (
                    <View style={styles.noDataContainer}>
                      <MaterialIcons
                        name="info-outline"
                        size={24}
                        color="#666"
                      />
                      <Text style={styles.noDataText}>
                        No fields available.
                      </Text>
                    </View>
                  ) : (
                    fields.map((f) => {
                      const value = values[f.fieldname] ?? "";
                      const options =
                        typeof f.options === "string"
                          ? f.options.split("\n").filter(Boolean)
                          : [];
                      if (f.fieldtype === "Check") {
                        return (
                          <View key={f.fieldname} style={styles.formField}>
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <TouchableOpacity
                              style={styles.checkField}
                              onPress={() => setFieldValue(f.fieldname, !value)}
                            >
                              <MaterialIcons
                                name={
                                  value
                                    ? "check-box"
                                    : "check-box-outline-blank"
                                }
                                size={20}
                                color="#007bff"
                              />
                              <Text style={styles.checkLabel}>{f.label}</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      }
                      if (f.fieldtype === "Select" && options.length > 0) {
                        return (
                          <View key={f.fieldname} style={styles.formField}>
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <View style={styles.selectField}>
                              {options.map((opt) => (
                                <TouchableOpacity
                                  key={opt}
                                  style={[
                                    styles.optionPill,
                                    value === opt && styles.optionPillActive,
                                  ]}
                                  onPress={() =>
                                    setFieldValue(f.fieldname, opt)
                                  }
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
                      if (
                        f.fieldtype === "Link" &&
                        typeof f.options === "string" &&
                        f.options
                      ) {
                        return (
                          <View key={f.fieldname} style={styles.formField}>
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <TextInput
                              style={styles.inputField}
                              value={String(value)}
                              onFocus={() =>
                                setDropdownOpen((prev) => {
                                  const next = {};
                                  Object.keys(prev).forEach(
                                    (k) => (next[k] = false)
                                  );
                                  return { ...next, [f.fieldname]: true };
                                })
                              }
                              onChangeText={async (t) => {
                                setFieldValue(f.fieldname, t);
                                const res = await fnSearchLink(
                                  t,
                                  f.options,
                                  0,
                                  doctype,
                                  { query: "", filters: {} }
                                );
                                setLinkResults((prev) => ({
                                  ...prev,
                                  [f.fieldname]: res,
                                }));
                                setDropdownOpen((prev) => ({
                                  ...prev,
                                  [f.fieldname]: true,
                                }));
                              }}
                              placeholder={f.placeholder || f.label}
                            />
                            {dropdownOpen[f.fieldname] &&
                              (linkResults[f.fieldname] || []).length > 0 && (
                                <View style={styles.dropdownList}>
                                  {(linkResults[f.fieldname] || []).map(
                                    (item) => {
                                      const val = item?.value ?? item;
                                      const label =
                                        (item?.description &&
                                          item.description.trim()) ||
                                        (typeof val === "string"
                                          ? val
                                          : String(val));
                                      return (
                                        <TouchableOpacity
                                          key={`${f.fieldname}-${val}`}
                                          style={[
                                            styles.dropdownItem,
                                            value === val &&
                                              styles.dropdownItemActive,
                                          ]}
                                          onPress={() => {
                                            setFieldValue(f.fieldname, val);
                                            setDropdownOpen((prev) => ({
                                              ...prev,
                                              [f.fieldname]: false,
                                            }));
                                          }}
                                        >
                                          <Text
                                            style={[
                                              styles.dropdownItemText,
                                              value === val &&
                                                styles.optionTextActive,
                                            ]}
                                          >
                                            {label}
                                          </Text>
                                        </TouchableOpacity>
                                      );
                                    }
                                  )}
                                </View>
                              )}
                          </View>
                        );
                      }
                      if (f.fieldtype === "Date") {
                        return (
                          <View key={f.fieldname} style={styles.formField}>
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <TouchableOpacity
                              style={styles.inputField}
                              onPress={() => {
                                setDropdownOpen({});
                                setDatePickerField(f.fieldname);
                              }}
                            >
                              <Text>
                                {value ? String(value) : "Select date"}
                              </Text>
                            </TouchableOpacity>
                            {datePickerField === f.fieldname && (
                              <DateTimePicker
                                mode="date"
                                value={value ? new Date(value) : new Date()}
                                onChange={(event, selectedDate) => {
                                  if (selectedDate) {
                                    const formatted = format(
                                      selectedDate,
                                      "yyyy-MM-dd"
                                    );
                                    setFieldValue(f.fieldname, formatted);
                                  }
                                  setDatePickerField(null);
                                }}
                              />
                            )}
                          </View>
                        );
                      }
                      return (
                        <View key={f.fieldname} style={styles.formField}>
                          <Text style={styles.formLabel}>
                            {f.label} {f.reqd ? "*" : ""}
                          </Text>
                          <TextInput
                            style={styles.inputField}
                            value={String(value)}
                            onFocus={() =>
                              setDropdownOpen((prev) => {
                                const next = {};
                                Object.keys(prev).forEach(
                                  (k) => (next[k] = false)
                                );
                                return next;
                              })
                            }
                            onChangeText={(t) => setFieldValue(f.fieldname, t)}
                            placeholder={f.placeholder || f.label}
                            keyboardType={
                              f.fieldtype === "Int" || f.fieldtype === "Float"
                                ? "numeric"
                                : "default"
                            }
                          />
                        </View>
                      );
                    })
                  )}
                </ScrollView>
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[
                      styles.footerButton,
                      { backgroundColor: "#6c757d" },
                    ]}
                    onPress={onClose}
                  >
                    <Text style={styles.footerButtonText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.footerButton,
                      { backgroundColor: "#007bff" },
                    ]}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.footerButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Formik>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#343a40",
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  formField: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 6,
  },
  inputField: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#343a40",
    backgroundColor: "#fff",
  },
  selectField: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  optionPill: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  optionPillActive: {
    borderColor: "#007bff",
    backgroundColor: "#e7f1ff",
  },
  optionText: {
    fontSize: 13,
    color: "#343a40",
  },
  optionTextActive: {
    color: "#007bff",
    fontWeight: "600",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: "#fff",
    maxHeight: 180,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e9ecef",
  },
  dropdownItemActive: {
    backgroundColor: "#e7f1ff",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#343a40",
  },
  checkField: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkLabel: {
    marginLeft: 8,
    color: "#343a40",
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e9ecef",
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  footerButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default DoctypeFormModal;
