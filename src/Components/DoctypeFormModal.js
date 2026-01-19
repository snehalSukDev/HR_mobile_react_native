import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  ToastAndroid,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getMetaData,
  getResource,
  saveDoc,
  submitSavedDoc,
} from "../utils/frappeApi";
import { Formik } from "formik";
import { format } from "date-fns";

import GenericField from "./FormComponents/GenericField";
import LinkField from "./FormComponents/LinkField";

const DoctypeFormModal = ({ visible, onClose, doctype, title, onSuccess }) => {
  const [fields, setFields] = useState([]);
  const [invalidFields, setInvalidFields] = useState({});

  const scrollRef = useRef(null);
  const positionsRef = useRef({});
  const isMountedRef = useRef(true);
  const metaCacheRef = useRef({});

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadMeta() {
      if (!visible) return;

      try {
        if (metaCacheRef.current[doctype]) {
          if (isMountedRef.current) {
            setFields(metaCacheRef.current[doctype]);
          }
          return;
        }

        const res = await getMetaData(doctype);
        if (!isMountedRef.current) return;

        const filtered = (res.fields || []).filter(
          (f) =>
            [
              "Data",
              "Date",
              "Int",
              "Float",
              "Currency",
              "Select",
              "Link",
              "Check",
              "Small Text",
              "Text",
            ].includes(f.fieldtype) &&
            !f.hidden &&
            !["amended_from", "naming_series"].includes(f.fieldname)
        );

        metaCacheRef.current[doctype] = filtered;
        setFields(filtered);
      } catch (err) {
        console.error("Error loading meta:", err);
        if (isMountedRef.current) {
          Alert.alert("Error", "Failed to load form definition");
          onClose();
        }
      }
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
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
                  posting_date: format(new Date(), "yyyy-MM-dd"),
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
            {({ values, setFieldValue, handleSubmit, isSubmitting }) => {
              const handleFieldChange = (fieldname, val) => {
                setFieldValue(fieldname, val);
                if (invalidFields[fieldname]) {
                  setInvalidFields((prev) => ({ ...prev, [fieldname]: false }));
                }

                if (
                  fieldname === "employee" &&
                  typeof val === "string" &&
                  val.trim().length >= 3
                ) {
                  (async () => {
                    try {
                      if (!isMountedRef.current) return;
                      const emp = await getResource("Employee", val);
                      if (isMountedRef.current && emp?.employee_name) {
                        setFieldValue("employee_name", emp.employee_name);
                      }
                    } catch {}
                  })();
                }
              };

              return (
                <>
                  <ScrollView
                    style={styles.modalBody}
                    ref={scrollRef}
                    keyboardShouldPersistTaps="handled"
                  >
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
                        const value = values[f.fieldname];

                        return (
                          <View
                            key={f.fieldname}
                            onLayout={(e) => {
                              positionsRef.current[f.fieldname] =
                                e.nativeEvent.layout.y;
                            }}
                          >
                            {f.fieldtype === "Link" ? (
                              <LinkField
                                field={f}
                                value={value}
                                onFieldChange={handleFieldChange}
                                doctype={doctype}
                                error={invalidFields[f.fieldname]}
                              />
                            ) : (
                              <GenericField
                                field={f}
                                value={value}
                                onFieldChange={handleFieldChange}
                                error={invalidFields[f.fieldname]}
                              />
                            )}
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
                      disabled={isSubmitting}
                    >
                      <Text style={styles.footerButtonText}>
                        {isSubmitting ? "Saving..." : "Submit"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            }}
          </Formik>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end", // Bottom sheet style usually, or center
    // If you want full screen center:
    // justifyContent: "center",
    // padding: 20
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    // If full screen center:
    // borderRadius: 12,
    // flex: 1,
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
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noDataText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
});

export default DoctypeFormModal;
