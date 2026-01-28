import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getMetaData,
  getResource,
  saveDoc,
  submitSavedDoc,
  getCurrentUser,
  fetchEmployeeDetails,
} from "../utils/frappeApi";
import { Formik, useFormikContext } from "formik";
import { format } from "date-fns";
import Toast from "react-native-toast-message";

import GenericField from "./FormComponents/GenericField";
import LinkField from "./FormComponents/LinkField";
import { useTheme } from "../context/ThemeContext";
import CustomLoader from "./CustomLoader";

const safeDate = (val) => {
  const d = val ? new Date(val) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
};

const DoctypeExpenseModal = ({
  visible,
  onClose,
  doctype,
  title,
  onSuccess,
  hiddenFields = [],
}) => {
  const { colors, theme } = useTheme();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [childTables, setChildTables] = useState([]);
  const [invalidFields, setInvalidFields] = useState({});
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const scrollRef = useRef(null);
  const positionsRef = useRef({});
  const isMountedRef = useRef(true);
  const metaCacheRef = useRef({});

  const dynamicStyles = useMemo(
    () => ({
      modalContainer: { backgroundColor: colors.background },
      modalHeader: {
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      },
      modalTitle: { color: colors.text },
      modalBody: { backgroundColor: colors.background },
      modalFooter: {
        borderTopColor: colors.border,
        backgroundColor: colors.card,
      },
      noDataText: { color: colors.textSecondary },
      childTableTitle: { color: colors.text },
      childRowContainer: {
        backgroundColor: theme === "dark" ? "#1E1E1E" : "#f9f9f9",
        borderColor: colors.border,
      },
      childRowTitle: { color: colors.textSecondary },
      closeIcon: { color: colors.text },
    }),
    [colors, theme],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadMeta() {
      if (!visible) return;
      setLoading(true);
      try {
        if (!employeeDetails) {
          try {
            const { email } = await getCurrentUser();
            if (email) {
              const emp = await fetchEmployeeDetails(email, true);
              if (isMountedRef.current) setEmployeeDetails(emp);
            }
          } catch (e) {
            console.warn("Failed to load employee details for prefill", e);
          }
        }

        const cached = metaCacheRef.current[doctype];
        if (cached && Array.isArray(cached.fields)) {
          if (!isMountedRef.current) return;
          const filteredCached = cached.fields.filter(
            (f) => !hiddenFields.includes(f.fieldname),
          );
          setFields(filteredCached);
          setChildTables(
            Array.isArray(cached.childTables) ? cached.childTables : [],
          );
          setLoading(false);
          return;
        }

        const res = await getMetaData(doctype);
        if (!isMountedRef.current) return;

        const rawFields = res && Array.isArray(res.fields) ? res.fields : [];
        const filtered = rawFields.filter(
          (f) =>
            f &&
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
              "Text Editor",
              "Long Text",
              "HTML Editor",
              "Code",
              "Markdown Editor",
              "Rich Text",
            ].includes(f.fieldtype) &&
            !f.hidden &&
            !["amended_from", "naming_series"].includes(f.fieldname) &&
            !hiddenFields.includes(f.fieldname),
        );

        const tables = [];
        const tableDefs = rawFields.filter(
          (f) =>
            f &&
            f.fieldtype === "Table" &&
            !f.hidden &&
            !["amended_from", "naming_series"].includes(f.fieldname),
        );
        for (const t of tableDefs) {
          const opt =
            t && typeof t.options === "string" ? t.options.trim() : "";
          if (!opt) continue;
          try {
            const childMeta = await getMetaData(opt);
            if (!isMountedRef.current) return;
            const childFields = (childMeta.fields || []).filter(
              (cf) =>
                cf &&
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
                  "Text Editor",
                  "Long Text",
                  "HTML Editor",
                  "Code",
                  "Markdown Editor",
                  "Rich Text",
                  "Table",
                ].includes(cf.fieldtype) &&
                !cf.hidden,
            );
            tables.push({
              fieldname: t.fieldname,
              label: t.label || t.fieldname,
              options: opt,
              fields: childFields,
            });
          } catch {}
        }

        if (!isMountedRef.current) return;
        metaCacheRef.current[doctype] = {
          fields: filtered,
          childTables: tables,
        };
        setFields(filtered);
        setChildTables(tables);
      } catch (err) {
        console.error("loadMeta error", err);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load form definition",
        });
        onClose();
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    }
    loadMeta();
  }, [visible, doctype]);

  const initialValues = useMemo(() => {
    const values = {};
    fields.forEach((f) => {
      let val = "";
      if (f.fieldtype === "Date" && f.fieldname === "posting_date") {
        val = format(new Date(), "yyyy-MM-dd");
      } else if (employeeDetails) {
        if (f.fieldname === "employee") val = employeeDetails.name || "";
        else if (f.fieldname === "employee_name")
          val = employeeDetails.employee_name || "";
        else if (f.fieldname === "department")
          val = employeeDetails.department || "";
        else if (f.fieldname === "company") val = employeeDetails.company || "";
      }
      values[f.fieldname] = val;
    });
    childTables.forEach((tbl) => {
      if (!values[tbl.fieldname]) {
        values[tbl.fieldname] = [];
      }
    });
    return values;
  }, [fields, childTables, employeeDetails]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.modalContainer, dynamicStyles.modalContainer]}
        >
          <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
              {title || doctype}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons
                name="close"
                size={22}
                color={dynamicStyles.closeIcon.color}
              />
            </TouchableOpacity>
          </View>
          <CustomLoader visible={loading || isSaving} />
          {!loading && (
            <Formik
              initialValues={initialValues}
              enableReinitialize={true}
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

                try {
                  const docValues = { ...values };
                  childTables.forEach((tbl) => {
                    const rows = Array.isArray(values[tbl.fieldname])
                      ? values[tbl.fieldname]
                      : [];
                    if (rows.length === 0) return;
                    docValues[tbl.fieldname] = rows.map((row, idx) => ({
                      ...row,
                      doctype: tbl.options,
                      parent: tempName,
                      parentfield: tbl.fieldname,
                      parenttype: doctype,
                      idx: idx + 1,
                      __islocal: 1,
                      __unsaved: 1,
                    }));
                  });
                  const doc = {
                    ...docValues,

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

                  if (!isMountedRef.current) return;

                  if (doctype === "Attendance Request") {
                    await submitSavedDoc(saved, doc);
                    if (!isMountedRef.current) return;
                  }

                  Toast.show({
                    type: "success",
                    text1: "Success",
                    text2:
                      doctype === "Attendance Request"
                        ? `${doctype} submitted successfully`
                        : `${doctype} saved successfully`,
                  });
                  if (typeof onSuccess === "function") {
                    onSuccess({ saved, tempDoc: doc, doctype });
                  }
                  onClose();
                } catch (err) {
                  if (!isMountedRef.current) return;
                  const serverText =
                    (err && err.serverMessagesText) ||
                    err.message ||
                    String(err);
                  Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: serverText,
                  });
                } finally {
                  setSubmitting(false);
                  setIsSaving(false);
                }
              }}
            >
              {({ values, setFieldValue, handleSubmit }) => {
                const handleFieldChange = (fieldname, val) => {
                  setFieldValue(fieldname, val);
                  if (invalidFields[fieldname]) {
                    setInvalidFields((prev) => ({
                      ...prev,
                      [fieldname]: false,
                    }));
                  }
                  if (
                    fieldname === "employee" &&
                    typeof val === "string" &&
                    val.trim().length >= 3
                  ) {
                    (async () => {
                      try {
                        if (!isMountedRef.current) return;
                        const emp = await getResource("Employee", val, {
                          cache: true,
                          cacheTTL: 60 * 60 * 1000, // 1 hour
                        });
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
                      style={[styles.modalBody, dynamicStyles.modalBody]}
                      ref={scrollRef}
                      keyboardShouldPersistTaps="handled"
                    >
                      {fields.length === 0 ? (
                        <View style={styles.noDataContainer}>
                          <MaterialIcons
                            name="info-outline"
                            size={24}
                            color={colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.noDataText,
                              dynamicStyles.noDataText,
                            ]}
                          >
                            No fields available.
                          </Text>
                        </View>
                      ) : (
                        fields.map((f) => {
                          const value = values[f.fieldname] ?? "";
                          return (
                            <View
                              key={f.fieldname}
                              style={styles.formField}
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
                      {childTables.length > 0 && (
                        <View>
                          {childTables.map((tbl) => {
                            const rows = Array.isArray(values[tbl.fieldname])
                              ? values[tbl.fieldname]
                              : [];
                            return (
                              <View
                                key={tbl.fieldname}
                                style={styles.childTableSection}
                              >
                                <View style={styles.childRowHeader}>
                                  <Text
                                    style={[
                                      styles.childTableTitle,
                                      dynamicStyles.childTableTitle,
                                    ]}
                                  >
                                    {tbl.label} ({tbl.options})
                                  </Text>
                                  <TouchableOpacity
                                    style={styles.childAddRowButton}
                                    onPress={() => {
                                      try {
                                        const existing = Array.isArray(
                                          values[tbl.fieldname],
                                        )
                                          ? values[tbl.fieldname]
                                          : [];
                                        const newRow = {};
                                        tbl.fields.forEach((cf) => {
                                          newRow[cf.fieldname] = "";
                                        });
                                        setFieldValue(tbl.fieldname, [
                                          ...existing,
                                          newRow,
                                        ]);
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }}
                                  >
                                    <Text style={styles.childAddRowText}>
                                      Add Row
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                                {rows.length === 0 ? (
                                  <Text
                                    style={[
                                      styles.noDataText,
                                      dynamicStyles.noDataText,
                                    ]}
                                  >
                                    No rows. Tap Add Row.
                                  </Text>
                                ) : (
                                  rows.map((row, rowIndex) => (
                                    <View
                                      key={`${tbl.fieldname}-row-${rowIndex}`}
                                      style={[
                                        styles.childRowContainer,
                                        dynamicStyles.childRowContainer,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.childRowTitle,
                                          dynamicStyles.childRowTitle,
                                        ]}
                                      >
                                        Row {rowIndex + 1}
                                      </Text>
                                      {tbl.fields.map((cf) => {
                                        const childValue =
                                          row[cf.fieldname] ?? "";
                                        return (
                                          <View
                                            key={`${tbl.fieldname}-${cf.fieldname}-${rowIndex}`}
                                            style={styles.formField}
                                          >
                                            {cf.fieldtype === "Link" ? (
                                              <LinkField
                                                field={cf}
                                                value={childValue}
                                                onFieldChange={(name, val) =>
                                                  setFieldValue(
                                                    `${tbl.fieldname}[${rowIndex}].${name}`,
                                                    val,
                                                  )
                                                }
                                                doctype={doctype}
                                              />
                                            ) : (
                                              <GenericField
                                                field={cf}
                                                value={childValue}
                                                onFieldChange={(name, val) =>
                                                  setFieldValue(
                                                    `${tbl.fieldname}[${rowIndex}].${name}`,
                                                    val,
                                                  )
                                                }
                                              />
                                            )}
                                          </View>
                                        );
                                      })}
                                    </View>
                                  ))
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </ScrollView>
                    <View
                      style={[styles.modalFooter, dynamicStyles.modalFooter]}
                    >
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
                          { backgroundColor: colors.primary },
                        ]}
                        onPress={handleSubmit}
                      >
                        <Text style={styles.footerButtonText}>Submit</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              }}
            </Formik>
          )}
        </KeyboardAvoidingView>
        <Toast />
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
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
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
  childTableSection: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e9ecef",
  },
  childTableTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#343a40",
    marginBottom: 8,
  },
  childFieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  childFieldLabel: {
    fontSize: 13,
    color: "#343a40",
  },
  childFieldType: {
    fontSize: 12,
    color: "#6c757d",
  },
  childRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  childAddRowButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#007bff",
  },
  childAddRowText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  childRowContainer: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e9ecef",
  },
  childRowTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#343a40",
    marginBottom: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});

export default DoctypeExpenseModal;
