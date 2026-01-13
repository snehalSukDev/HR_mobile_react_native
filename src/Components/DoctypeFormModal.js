import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  ToastAndroid,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getMetaData,
  fnSearchLink,
  getResource,
  saveDoc,
  submitSavedDoc,
} from "../utils/frappeApi";
import { Formik } from "formik";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { Alert } from "react-native";

const DoctypeFormModal = ({ visible, onClose, doctype, title, onSuccess }) => {
  const [fields, setFields] = useState([]);
  const [linkResults, setLinkResults] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [datePickerField, setDatePickerField] = useState(null);
  const [invalidFields, setInvalidFields] = useState({});
  const scrollRef = useRef(null);
  const positionsRef = useRef({});

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
          ].includes(f.fieldtype) &&
          !f.hidden &&
          !["amended_from", "naming_series"].includes(f.fieldname)
      );
      setFields(filtered);
    }
    loadMeta();
  }, [visible, doctype]);

  const initialValues = {};
  fields.forEach((f) => {
    if (f.fieldtype === "Date" && f.fieldname === "posting_date") {
      initialValues[f.fieldname] = format(new Date(), "yyyy-MM-dd");
    } else {
      initialValues[f.fieldname] = "";
    }
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
              const missing = [];
              fields.forEach((f) => {
                if (f.reqd) {
                  const v = values[f.fieldname];
                  let empty = false;
                  if (f.fieldtype === "Check") {
                    empty = v !== true;
                  } else if (v == null) {
                    empty = true;
                  } else if (typeof v === "string") {
                    empty = v.trim().length === 0;
                  }
                  if (empty) missing.push(f.fieldname);
                }
              });
              if (missing.length > 0) {
                const nextInvalid = {};
                missing.forEach((k) => (nextInvalid[k] = true));
                setInvalidFields(nextInvalid);
                const first = missing[0];
                const y = positionsRef.current[first] ?? 0;
                if (scrollRef.current && typeof y === "number") {
                  scrollRef.current.scrollTo({
                    y: Math.max(y - 12, 0),
                    animated: true,
                  });
                }
                setSubmitting(false);
                return;
              } else {
                setInvalidFields({});
              }
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

                const saved = await saveDoc(doc);

                if (doctype === "Attendance Request") {
                  await submitSavedDoc(saved, doc);
                }

                Alert.alert(
                  "Success",
                  doctype === "Attendance Request"
                    ? `${doctype} submitted successfully`
                    : `${doctype} saved successfully`
                );
                if (typeof onSuccess === "function") {
                  onSuccess({ saved, tempDoc: doc, doctype });
                }
                onClose();
              } catch (err) {
                const serverText =
                  (err && err.serverMessagesText) || err.message || String(err);
                if (Platform.OS === "android") {
                  ToastAndroid.show(serverText, ToastAndroid.LONG);
                } else {
                  Alert.alert("Error", serverText);
                }
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ values, setFieldValue, handleSubmit }) => (
              <>
                <ScrollView style={styles.modalBody} ref={scrollRef}>
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
                          <View
                            key={f.fieldname}
                            style={styles.formField}
                            onLayout={(e) => {
                              positionsRef.current[f.fieldname] =
                                e.nativeEvent.layout.y;
                            }}
                          >
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <TouchableOpacity
                              style={styles.checkField}
                              onPress={() => {
                                setFieldValue(f.fieldname, !value);
                                setInvalidFields((prev) => ({
                                  ...prev,
                                  [f.fieldname]: false,
                                }));
                              }}
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
                          <View
                            key={f.fieldname}
                            style={styles.formField}
                            onLayout={(e) => {
                              positionsRef.current[f.fieldname] =
                                e.nativeEvent.layout.y;
                            }}
                          >
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <View
                              style={[
                                styles.selectField,
                                invalidFields[f.fieldname] &&
                                  styles.inputFieldError,
                              ]}
                            >
                              {options.map((opt) => (
                                <TouchableOpacity
                                  key={opt}
                                  style={[
                                    styles.optionPill,
                                    value === opt && styles.optionPillActive,
                                  ]}
                                  onPress={() => {
                                    setFieldValue(f.fieldname, opt);
                                    setInvalidFields((prev) => ({
                                      ...prev,
                                      [f.fieldname]: false,
                                    }));
                                  }}
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
                          <View
                            key={f.fieldname}
                            style={styles.formField}
                            onLayout={(e) => {
                              positionsRef.current[f.fieldname] =
                                e.nativeEvent.layout.y;
                            }}
                          >
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <TextInput
                              style={[
                                styles.inputField,
                                invalidFields[f.fieldname] &&
                                  styles.inputFieldError,
                              ]}
                              value={String(value)}
                              onFocus={() => {
                                setDropdownOpen((prev) => {
                                  const next = {};
                                  Object.keys(prev).forEach(
                                    (k) => (next[k] = false)
                                  );
                                  return { ...next, [f.fieldname]: true };
                                });
                                (async () => {
                                  const res = await fnSearchLink(
                                    String(value || ""),
                                    f.options,
                                    0,
                                    doctype,
                                    { query: "", filters: {} }
                                  );
                                  setLinkResults((prev) => ({
                                    ...prev,
                                    [f.fieldname]: res,
                                  }));
                                })();
                              }}
                              onChangeText={async (t) => {
                                setFieldValue(f.fieldname, t);
                                setInvalidFields((prev) => ({
                                  ...prev,
                                  [f.fieldname]: false,
                                }));
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
                                      const rawVal =
                                        (item && typeof item === "object"
                                          ? item.value ||
                                            item.name ||
                                            item.id ||
                                            item.label
                                          : item) ?? "";
                                      const val =
                                        typeof rawVal === "string"
                                          ? rawVal
                                          : String(rawVal);
                                      const label =
                                        (item &&
                                          typeof item === "object" &&
                                          typeof item.description ===
                                            "string" &&
                                          item.description.trim()) ||
                                        (item &&
                                          typeof item === "object" &&
                                          typeof item.label === "string" &&
                                          item.label) ||
                                        val;
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
                                            setInvalidFields((prev) => ({
                                              ...prev,
                                              [f.fieldname]: false,
                                            }));
                                            if (f.fieldname === "employee") {
                                              (async () => {
                                                try {
                                                  const emp = await getResource(
                                                    "Employee",
                                                    val
                                                  );
                                                  const empName =
                                                    emp?.employee_name || "";
                                                  if (empName) {
                                                    setFieldValue(
                                                      "employee_name",
                                                      empName
                                                    );
                                                  }
                                                } catch {}
                                              })();
                                            }
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
                          <View
                            key={f.fieldname}
                            style={styles.formField}
                            onLayout={(e) => {
                              positionsRef.current[f.fieldname] =
                                e.nativeEvent.layout.y;
                            }}
                          >
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <TouchableOpacity
                              style={[
                                styles.inputField,
                                invalidFields[f.fieldname] &&
                                  styles.inputFieldError,
                              ]}
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
                                    setInvalidFields((prev) => ({
                                      ...prev,
                                      [f.fieldname]: false,
                                    }));
                                  }
                                  setDatePickerField(null);
                                }}
                              />
                            )}
                          </View>
                        );
                      }
                      return (
                        <View
                          key={f.fieldname}
                          style={styles.formField}
                          onLayout={(e) => {
                            positionsRef.current[f.fieldname] =
                              e.nativeEvent.layout.y;
                          }}
                        >
                          <Text style={styles.formLabel}>
                            {f.label} {f.reqd ? "*" : ""}
                          </Text>
                          <TextInput
                            style={[
                              styles.inputField,
                              invalidFields[f.fieldname] &&
                                styles.inputFieldError,
                            ]}
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
                            onChangeText={(t) => {
                              setFieldValue(f.fieldname, t);
                              setInvalidFields((prev) => ({
                                ...prev,
                                [f.fieldname]: false,
                              }));
                            }}
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
  inputFieldError: {
    borderColor: "#dc3545",
    borderWidth: 1,
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
